import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { identityVerificationProvider } from '@/lib/identity-provider';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAppSession(request);
    const database = await ensureMarketplaceDatabase();
    const verification = await database.prepare(`SELECT id, provider, document_type, document_last4, birth_date, status, risk_level,
      rejection_reason, submitted_at, reviewed_at, verified_at, updated_at
      FROM buyer_identity_verifications WHERE user_id = ? LIMIT 1`).bind(session.user.id).first();
    return Response.json({ verification, user: session.user }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'verification_unavailable', message: 'Не удалось загрузить статус проверки.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAppSession(request);
    const payload = await request.json() as Record<string, unknown>;
    const documentType = payload.documentType === 'passport' || payload.documentType === 'id_card' ? payload.documentType : null;
    const documentNumber = typeof payload.documentNumber === 'string' ? payload.documentNumber.replace(/\s+/g, '').toUpperCase() : '';
    const birthDate = typeof payload.birthDate === 'string' ? payload.birthDate : '';
    const consent = payload.consent === true;
    const birth = new Date(`${birthDate}T00:00:00Z`);
    const minimumAgeDate = new Date();
    minimumAgeDate.setUTCFullYear(minimumAgeDate.getUTCFullYear() - 18);
    if (!documentType || !/^[A-Z0-9]{6,20}$/.test(documentNumber) || Number.isNaN(birth.getTime()) || birth > minimumAgeDate || !consent) {
      return Response.json({ error: 'validation_failed', message: 'Проверьте документ, дату рождения и согласие на проверку.' }, { status: 400 });
    }
    const database = await ensureMarketplaceDatabase();
    const existing = await database.prepare(`SELECT id, status FROM buyer_identity_verifications WHERE user_id = ? LIMIT 1`).bind(session.user.id).first<{ id: string; status: string }>();
    if (existing?.status === 'verified') return Response.json({ error: 'already_verified', message: 'Личность уже подтверждена.' }, { status: 409 });
    if (existing && ['submitted', 'in_review'].includes(existing.status)) return Response.json({ error: 'already_submitted', message: 'Заявка уже находится на проверке.' }, { status: 409 });

    const providerCase = await identityVerificationProvider().createCase(session.user.id, { documentType, documentNumber, birthDate });
    const caseId = existing?.id ?? crypto.randomUUID();
    await database.batch([
      database.prepare(`INSERT INTO buyer_identity_verifications (id, user_id, provider, provider_reference, document_type, document_last4, birth_date, status, risk_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?)
        ON CONFLICT(user_id) DO UPDATE SET provider = excluded.provider, provider_reference = excluded.provider_reference, document_type = excluded.document_type,
          document_last4 = excluded.document_last4, birth_date = excluded.birth_date, status = 'submitted', risk_level = excluded.risk_level,
          rejection_reason = NULL, submitted_at = CURRENT_TIMESTAMP, reviewed_by = NULL, reviewed_at = NULL, verified_at = NULL, updated_at = CURRENT_TIMESTAMP`)
        .bind(caseId, session.user.id, providerCase.provider, providerCase.reference, documentType, documentNumber.slice(-4), birthDate, providerCase.riskLevel),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'user', ?, 'identity.verification_submitted', 'user', ?, ?)`).bind(crypto.randomUUID(), session.user.id, session.user.id, JSON.stringify({ caseId, provider: providerCase.provider })),
    ]);
    return Response.json({ caseId, status: 'submitted', message: 'Заявка отправлена на проверку.' }, { status: 201 });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'verification_submit_failed', message: 'Не удалось отправить заявку на проверку.' }, { status: 500 });
  }
}
