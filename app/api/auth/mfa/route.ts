import { ensureMarketplaceDatabase } from '@/lib/database';
import { passwordSessionUser, sameOrigin, sessionCookie, sessionToken } from '@/lib/password-auth';
import { decryptTotpSecret, encryptTotpSecret, matchingTotpStep, newRecoveryCodes, newTotpSecret, normalizeRecoveryCode } from '@/lib/platform-mfa';
import { tokenHash } from '@/lib/password';

export const dynamic = 'force-dynamic';

type Credential = { encrypted_secret: string; status: 'pending' | 'active'; last_used_step: number };

async function context(request: Request) {
  const user = await passwordSessionUser(request);
  if (!user) return null;
  const database = await ensureMarketplaceDatabase();
  const role = await database.prepare('SELECT 1 AS allowed FROM platform_role_assignments WHERE user_id = ? LIMIT 1').bind(user.id).first();
  if (!role) return null;
  return { user, database };
}

const noStore = { 'Cache-Control': 'private, no-store' };

async function recordMfaEvent(database: D1Database, userId: string, action: string, method: string) {
  await database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
    VALUES (?, 'system', ?, ?, 'user', ?, ?)`).bind(crypto.randomUUID(), userId, action, userId, JSON.stringify({ method })).run().catch((error) => console.error('Failed to record MFA event', error));
}

export async function GET(request: Request) {
  const state = await context(request);
  if (!state) return Response.json({ error: 'unauthenticated' }, { status: 401, headers: noStore });
  const credential = await state.database.prepare('SELECT status FROM platform_mfa_credentials WHERE user_id = ?').bind(state.user.id).first<{ status: string }>();
  return Response.json({ status: state.user.mfa_verified_at ? 'verified' : credential?.status === 'active' ? 'code_required' : 'setup_required', email: state.user.email }, { headers: noStore });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'forbidden' }, { status: 403 });
  try {
    const state = await context(request);
    if (!state || state.user.mfa_verified_at) return Response.json({ error: 'forbidden' }, { status: 403, headers: noStore });
    const existing = await state.database.prepare('SELECT status FROM platform_mfa_credentials WHERE user_id = ?').bind(state.user.id).first<{ status: string }>();
    if (existing?.status === 'active') return Response.json({ error: 'already_enabled', message: 'MFA уже настроена. Введите код из приложения.' }, { status: 409, headers: noStore });
    const secret = newTotpSecret();
    const encrypted = await encryptTotpSecret(secret, state.user.id);
    await state.database.prepare(`INSERT INTO platform_mfa_credentials (user_id, encrypted_secret, status) VALUES (?, ?, 'pending')
      ON CONFLICT(user_id) DO UPDATE SET encrypted_secret = excluded.encrypted_secret, status = 'pending', last_used_step = -1, updated_at = CURRENT_TIMESTAMP`).bind(state.user.id, encrypted).run();
    const uri = `otpauth://totp/${encodeURIComponent(`EstateHub:${state.user.email}`)}?${new URLSearchParams({ secret, issuer: 'EstateHub', algorithm: 'SHA1', digits: '6', period: '30' })}`;
    return Response.json({ secret, uri, message: 'Добавьте ключ в приложение-аутентификатор и подтвердите шестизначным кодом.' }, { headers: noStore });
  } catch (error) {
    console.error('MFA setup unavailable', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'mfa_unavailable', message: 'Не удалось настроить MFA. Проверьте конфигурацию сервера.' }, { status: 503, headers: noStore });
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'forbidden' }, { status: 403 });
  try {
    const state = await context(request);
    const token = sessionToken(request);
    if (!state || !token || state.user.mfa_verified_at) return Response.json({ error: 'unauthenticated' }, { status: 401, headers: noStore });
    const body = await request.json() as { code?: unknown };
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const isTotp = /^\d{6}$/.test(code);
    const recoveryCode = normalizeRecoveryCode(code);
    if (!isTotp && !recoveryCode) return Response.json({ error: 'validation_failed', message: 'Введите шестизначный код или резервный код.' }, { status: 400, headers: noStore });
    const now = Math.floor(Date.now() / 1000);
    const bucket = `mfa:${state.user.id}`;
    const attempt = await state.database.prepare(`INSERT INTO auth_rate_limits (bucket, attempts, expires_at) VALUES (?, 1, ?)
      ON CONFLICT(bucket) DO UPDATE SET attempts = CASE WHEN expires_at <= ? THEN 1 ELSE attempts + 1 END,
      expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END RETURNING attempts`).bind(bucket, now + 900, now, now).first<{ attempts: number }>();
    if ((attempt?.attempts ?? 11) > 10) {
      if (attempt?.attempts === 11) await recordMfaEvent(state.database, state.user.id, 'auth.mfa_rate_limited', 'unknown');
      return Response.json({ error: 'rate_limited', message: 'Слишком много попыток. Повторите через 15 минут.' }, { status: 429, headers: { ...noStore, 'Retry-After': '900' } });
    }
    const credential = await state.database.prepare('SELECT encrypted_secret, status, last_used_step FROM platform_mfa_credentials WHERE user_id = ?').bind(state.user.id).first<Credential>();
    if (!credential) return Response.json({ error: 'setup_required', message: 'Сначала настройте приложение-аутентификатор.' }, { status: 409, headers: noStore });
    let recoveryCodes: string[] = [];
    if (isTotp) {
      const secret = await decryptTotpSecret(credential.encrypted_secret, state.user.id);
      const step = await matchingTotpStep(secret, code, credential.last_used_step);
      if (step === null) {
        await recordMfaEvent(state.database, state.user.id, 'auth.mfa_failed', 'totp');
        return Response.json({ error: 'invalid_code', message: 'Неверный или уже использованный код.' }, { status: 400, headers: noStore });
      }
      const accepted = await state.database.prepare(`UPDATE platform_mfa_credentials SET status = 'active', last_used_step = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND last_used_step < ?`).bind(step, state.user.id, step).run();
      if ((accepted.meta.changes ?? 0) !== 1) {
        await recordMfaEvent(state.database, state.user.id, 'auth.mfa_failed', 'replayed_totp');
        return Response.json({ error: 'replayed_code', message: 'Код уже использован. Дождитесь следующего.' }, { status: 409, headers: noStore });
      }
      if (credential.status === 'pending') recoveryCodes = newRecoveryCodes();
    } else {
      if (credential.status !== 'active' || !recoveryCode) return Response.json({ error: 'invalid_code', message: 'Резервный код недоступен.' }, { status: 400, headers: noStore });
      const accepted = await state.database.prepare(`UPDATE platform_mfa_recovery_codes SET used_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND code_hash = ? AND used_at IS NULL`).bind(state.user.id, await tokenHash(recoveryCode)).run();
      if ((accepted.meta.changes ?? 0) !== 1) {
        await recordMfaEvent(state.database, state.user.id, 'auth.mfa_failed', 'recovery');
        return Response.json({ error: 'invalid_code', message: 'Неверный или уже использованный резервный код.' }, { status: 400, headers: noStore });
      }
    }
    const recoveryHashes = await Promise.all(recoveryCodes.map((item) => tokenHash(item.replaceAll('-', ''))));
    await state.database.batch([
      ...recoveryHashes.map((hash) => state.database.prepare('INSERT INTO platform_mfa_recovery_codes (user_id, code_hash) VALUES (?, ?)').bind(state.user.id, hash)),
      state.database.prepare('UPDATE auth_sessions SET mfa_verified_at = ?, expires_at = ? WHERE token_hash = ? AND user_id = ?').bind(now, now + 12 * 3600, await tokenHash(token), state.user.id),
      state.database.prepare('DELETE FROM auth_rate_limits WHERE bucket = ?').bind(bucket),
      state.database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'auth.mfa_verified', 'user', ?, ?)`).bind(crypto.randomUUID(), state.user.id, state.user.id, JSON.stringify({ method: isTotp ? 'totp' : 'recovery' })),
    ]);
    return Response.json({ status: 'verified', redirectTo: '/admin', recoveryCodes }, { headers: { ...noStore, 'Set-Cookie': sessionCookie(request, token, 12 * 3600) } });
  } catch (error) {
    console.error('MFA verification unavailable', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'mfa_unavailable', message: 'Не удалось проверить код. Повторите попытку.' }, { status: 503, headers: noStore });
  }
}
