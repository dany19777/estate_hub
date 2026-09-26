import { authorizationResponse, requirePlatformPermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { deliverSupportMail, supportMailConfigured, type SupportMailRequest } from '@/lib/support-mail';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await requirePlatformPermission(request, 'MANAGE_SUPPORT');
    const body = await request.json() as { requestId?: unknown };
    const requestId = typeof body.requestId === 'string' ? body.requestId : '';
    if (!requestId) return Response.json({ error: 'invalid_request', message: 'Выберите обращение.' }, { status: 400 });
    if (!supportMailConfigured()) return Response.json({ error: 'mail_unconfigured', message: 'Сначала настройте почтовый сервис и адрес отправителя.' }, { status: 503 });

    const database = await ensureMarketplaceDatabase();
    const item = await database.prepare(`SELECT id, full_name, email, subject, message, locale, delivery_status
      FROM support_requests WHERE id = ? LIMIT 1`).bind(requestId).first<SupportMailRequest & { delivery_status: string }>();
    if (!item) return Response.json({ error: 'not_found', message: 'Обращение не найдено.' }, { status: 404 });
    if (item.delivery_status === 'sent') return Response.json({ requestId, deliveryStatus: 'sent', message: 'Письмо уже передано почтовому сервису.' });

    const result = await deliverSupportMail(item);
    await database.batch([
      database.prepare(`UPDATE support_requests SET delivery_status = ?, delivery_provider = 'resend', delivery_reference = ?,
        delivery_error = ?, sent_at = CASE WHEN ? = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END WHERE id = ?`)
        .bind(result.ok ? 'sent' : 'failed', result.reference, result.error, result.ok ? 'sent' : 'failed', requestId),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'user', ?, 'support.email_retry', 'support_request', ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, requestId, JSON.stringify({ success: result.ok, reference: result.reference })),
    ]);
    return Response.json({ requestId, deliveryStatus: result.ok ? 'sent' : 'failed', message: result.ok ? 'Письмо передано почтовому сервису.' : result.error }, { status: result.ok ? 200 : 502 });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'support_retry_failed', message: 'Не удалось повторить отправку.' }, { status: 500 });
  }
}
