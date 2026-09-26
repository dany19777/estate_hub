import { authorizationResponse, requirePlatformPermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requirePlatformPermission(request, 'MANAGE_SUPPORT');
    const database = await ensureMarketplaceDatabase();
    const [result, counts] = await Promise.all([
      database.prepare(`SELECT request.id, request.full_name, request.email, request.subject, request.message,
        request.locale, request.delivery_status, request.delivery_error, request.created_at,
        COALESCE(handling.status, 'new') AS handling_status, handling.internal_note,
        handler.full_name AS handled_by_name, handling.updated_at AS handled_at
        FROM support_requests request
        LEFT JOIN support_request_handling handling ON handling.request_id = request.id
        LEFT JOIN users handler ON handler.id = handling.handled_by
        ORDER BY CASE COALESCE(handling.status, 'new') WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
          request.created_at DESC LIMIT 100`).all(),
      database.prepare(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN handling.request_id IS NULL THEN 1 ELSE 0 END) AS new_count,
        SUM(CASE WHEN request.delivery_status <> 'sent' THEN 1 ELSE 0 END) AS undelivered_count
        FROM support_requests request LEFT JOIN support_request_handling handling ON handling.request_id = request.id`).first(),
    ]);
    return Response.json({ requests: result.results ?? [], stats: counts ?? { total: 0, new_count: 0, undelivered_count: 0 } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'support_queue_failed', message: 'Не удалось загрузить обращения.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePlatformPermission(request, 'MANAGE_SUPPORT');
    const body = await request.json() as Record<string, unknown>;
    const requestId = typeof body.requestId === 'string' ? body.requestId : '';
    const status = body.status === 'in_progress' || body.status === 'answered' || body.status === 'closed' ? body.status : '';
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : '';
    if (!requestId || !status || (status !== 'in_progress' && note.length < 5)) {
      return Response.json({ error: 'validation_failed', message: 'Выберите действие и укажите итог обработки.' }, { status: 400 });
    }
    const database = await ensureMarketplaceDatabase();
    const exists = await database.prepare(`SELECT id FROM support_requests WHERE id = ? LIMIT 1`).bind(requestId).first();
    if (!exists) return Response.json({ error: 'not_found', message: 'Обращение не найдено.' }, { status: 404 });
    await database.batch([
      database.prepare(`INSERT INTO support_request_handling (request_id, status, handled_by, internal_note)
        VALUES (?, ?, ?, ?) ON CONFLICT(request_id) DO UPDATE SET status = excluded.status,
          handled_by = excluded.handled_by, internal_note = excluded.internal_note, updated_at = CURRENT_TIMESTAMP`)
        .bind(requestId, status, session.user.id, note),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'user', ?, 'support.status_changed', 'support_request', ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, requestId, JSON.stringify({ status, note })),
    ]);
    return Response.json({ requestId, status, message: 'Статус обращения сохранён.' });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'support_update_failed', message: 'Не удалось обновить обращение.' }, { status: 500 });
  }
}
