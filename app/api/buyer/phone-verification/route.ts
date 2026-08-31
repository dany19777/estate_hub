import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

type ChallengeRow = { id: string; phone_e164: string; code_hash: string; attempts: number; expires_at: string };

function normalizeUzbekPhone(value: unknown) {
  if (typeof value !== 'string') return null;
  let digits = value.replace(/\D/g, '');
  if (digits.length === 9) digits = `998${digits}`;
  return digits.length === 12 && digits.startsWith('998') ? `+${digits}` : null;
}

async function hashCode(challengeId: string, code: string) {
  const bytes = new TextEncoder().encode(`${challengeId}:${code}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function makeCode() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return value.toString().padStart(6, '0');
}

export async function GET(request: Request) {
  try {
    const session = await getAppSession(request);
    return Response.json(session.phoneVerification, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'phone_status_unavailable', message: 'Не удалось проверить статус телефона.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAppSession(request);
    const body = await request.json() as { phone?: unknown };
    const phone = normalizeUzbekPhone(body.phone);
    if (!phone) return Response.json({ error: 'validation_failed', message: 'Введите номер Узбекистана в формате +998.' }, { status: 400 });
    if (session.phoneVerification.status === 'verified' && session.phoneVerification.phone === phone) return Response.json({ status: 'verified', phone, message: 'Этот номер уже подтверждён.' });
    const database = await ensureMarketplaceDatabase();
    const conflict = await database.prepare(`SELECT user_id FROM buyer_phone_verifications WHERE phone_e164 = ? AND user_id != ? AND status = 'verified' LIMIT 1`).bind(phone, session.user.id).first();
    if (conflict) return Response.json({ error: 'phone_in_use', message: 'Этот номер уже привязан к другому аккаунту.' }, { status: 409 });
    const recent = await database.prepare(`SELECT id FROM phone_verification_challenges WHERE user_id = ? AND consumed_at IS NULL AND created_at > datetime('now', '-1 minute') LIMIT 1`).bind(session.user.id).first();
    if (recent) return Response.json({ error: 'rate_limited', message: 'Новый код можно запросить через минуту.' }, { status: 429 });
    const challengeId = crypto.randomUUID();
    const code = makeCode();
    const codeHash = await hashCode(challengeId, code);
    await database.batch([
      database.prepare(`INSERT INTO buyer_phone_verifications (user_id, phone_e164, status) VALUES (?, ?, 'pending')
        ON CONFLICT(user_id) DO UPDATE SET phone_e164 = excluded.phone_e164, status = 'pending', verified_at = NULL, updated_at = CURRENT_TIMESTAMP`).bind(session.user.id, phone),
      database.prepare(`INSERT INTO phone_verification_challenges (id, user_id, phone_e164, code_hash, expires_at) VALUES (?, ?, ?, ?, datetime('now', '+10 minutes'))`).bind(challengeId, session.user.id, phone, codeHash),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'buyer.phone_code_requested', 'user', ?, ?)`).bind(crypto.randomUUID(), session.user.id, session.user.id, JSON.stringify({ phoneLast4: phone.slice(-4), provider: 'sandbox' })),
    ]);
    return Response.json({ status: 'pending', phone, expiresInSeconds: 600, demoCode: code, provider: 'sandbox', message: 'Код создан. На закрытом стенде он показан прямо в форме.' }, { status: 201 });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'phone_code_failed', message: 'Не удалось отправить код подтверждения.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getAppSession(request);
    const body = await request.json() as { code?: unknown };
    const code = typeof body.code === 'string' ? body.code.replace(/\D/g, '') : '';
    if (!/^\d{6}$/.test(code)) return Response.json({ error: 'validation_failed', message: 'Введите шестизначный код.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const challenge = await database.prepare(`SELECT id, phone_e164, code_hash, attempts, expires_at FROM phone_verification_challenges
      WHERE user_id = ? AND consumed_at IS NULL AND expires_at > CURRENT_TIMESTAMP AND attempts < 5 ORDER BY created_at DESC LIMIT 1`).bind(session.user.id).first<ChallengeRow>();
    if (!challenge) return Response.json({ error: 'challenge_expired', message: 'Код истёк или исчерпал число попыток. Запросите новый.' }, { status: 409 });
    const candidate = await hashCode(challenge.id, code);
    if (candidate !== challenge.code_hash) {
      await database.prepare(`UPDATE phone_verification_challenges SET attempts = attempts + 1 WHERE id = ? AND attempts < 5`).bind(challenge.id).run();
      return Response.json({ error: 'invalid_code', attemptsRemaining: Math.max(0, 4 - challenge.attempts), message: 'Неверный код подтверждения.' }, { status: 400 });
    }
    await database.batch([
      database.prepare(`UPDATE phone_verification_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(challenge.id),
      database.prepare(`UPDATE buyer_phone_verifications SET status = 'verified', verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND phone_e164 = ?`).bind(session.user.id, challenge.phone_e164),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'buyer.phone_verified', 'user', ?, ?)`).bind(crypto.randomUUID(), session.user.id, session.user.id, JSON.stringify({ phoneLast4: challenge.phone_e164.slice(-4), challengeId: challenge.id })),
    ]);
    return Response.json({ status: 'verified', phone: challenge.phone_e164, verifiedAt: new Date().toISOString(), message: 'Телефон подтверждён.' });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'phone_verification_failed', message: 'Не удалось подтвердить телефон.' }, { status: 500 });
  }
}
