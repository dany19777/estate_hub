import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

const categories = new Set(['unit_unavailable', 'terms_not_honored', 'developer_cancelled', 'payment_issue', 'other']);

export async function GET(request: Request) {
  try {
    const session = await getAppSession(request);
    const database = await ensureMarketplaceDatabase();
    const result = await database.prepare(`SELECT dispute.id, dispute.reservation_id, dispute.category, dispute.description,
      dispute.status, dispute.priority, dispute.resolution_note, dispute.created_at, dispute.updated_at, dispute.resolved_at,
      reservation.reservation_fee_uzs, reservation.status AS reservation_status, reservation.payment_status,
      complex.name AS complex_name, complex.slug, unit.unit_number
      FROM reservation_disputes dispute
      JOIN reservation_transactions reservation ON reservation.id = dispute.reservation_id
      JOIN complexes complex ON complex.id = reservation.complex_id
      JOIN units unit ON unit.id = reservation.unit_id
      WHERE dispute.opened_by_user_id = ? ORDER BY dispute.created_at DESC LIMIT 50`).bind(session.user.id).all();
    return Response.json({ disputes: result.results ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'disputes_unavailable', message: 'Не удалось загрузить обращения.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAppSession(request);
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
      return Response.json({ error: 'idempotency_required', message: 'Обновите страницу и повторите отправку обращения.' }, { status: 400 });
    }
    const payload = await request.json() as Record<string, unknown>;
    const reservationId = typeof payload.reservationId === 'string' ? payload.reservationId : '';
    const category = typeof payload.category === 'string' && categories.has(payload.category) ? payload.category : '';
    const description = typeof payload.description === 'string' ? payload.description.trim().slice(0, 1000) : '';
    if (!reservationId || !category || description.length < 20) {
      return Response.json({ error: 'validation_failed', message: 'Выберите причину и опишите проблему минимум в 20 символах.' }, { status: 400 });
    }

    const database = await ensureMarketplaceDatabase();
    const duplicate = await database.prepare(`SELECT id, status FROM reservation_disputes WHERE idempotency_key = ? AND opened_by_user_id = ? LIMIT 1`)
      .bind(idempotencyKey, session.user.id).first<{ id: string; status: string }>();
    if (duplicate) return Response.json({ disputeId: duplicate.id, status: duplicate.status, duplicate: true });
    const reservation = await database.prepare(`SELECT id, lead_id, payment_status, status FROM reservation_transactions
      WHERE id = ? AND buyer_user_id = ? LIMIT 1`).bind(reservationId, session.user.id).first<{ id: string; lead_id: string; payment_status: string; status: string }>();
    if (!reservation) return Response.json({ error: 'not_found', message: 'Бронирование не найдено.' }, { status: 404 });
    if (reservation.payment_status !== 'paid' || reservation.status !== 'confirmed') {
      return Response.json({ error: 'invalid_state', message: 'Спор можно открыть только по активной оплаченной брони.' }, { status: 409 });
    }
    const active = await database.prepare(`SELECT id, status FROM reservation_disputes WHERE reservation_id = ? AND status IN ('open', 'in_review') LIMIT 1`)
      .bind(reservationId).first<{ id: string; status: string }>();
    if (active) return Response.json({ error: 'already_open', disputeId: active.id, status: active.status, message: 'По этой брони уже рассматривается обращение.' }, { status: 409 });

    const disputeId = crypto.randomUUID();
    const priority = category === 'unit_unavailable' || category === 'developer_cancelled' ? 'high' : 'normal';
    await database.batch([
      database.prepare(`INSERT INTO reservation_disputes
        (id, reservation_id, opened_by_user_id, category, description, status, priority, idempotency_key)
        VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`)
        .bind(disputeId, reservationId, session.user.id, category, description, priority, idempotencyKey),
      database.prepare(`INSERT INTO lead_activities (id, lead_id, actor_type, actor_id, activity_type, metadata_json)
        VALUES (?, ?, 'buyer', ?, 'reservation.dispute_opened', ?)`)
        .bind(crypto.randomUUID(), reservation.lead_id, session.user.id, JSON.stringify({ disputeId, category, priority })),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'user', ?, 'reservation.dispute_opened', 'reservation_dispute', ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, disputeId, JSON.stringify({ reservationId, category, priority, idempotencyKey })),
    ]);
    return Response.json({ disputeId, status: 'open', priority, message: 'Обращение передано финансовому специалисту.' }, { status: 201 });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to create reservation dispute', error);
    return Response.json({ error: 'dispute_creation_failed', message: 'Не удалось отправить обращение.' }, { status: 500 });
  }
}
