import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAppSession(request);
    const { id } = await params;
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) return Response.json({ error: 'idempotency_required', message: 'Не удалось безопасно подтвердить оплату.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const reference = `sandbox-${idempotencyKey}`;
    const result = await database.prepare(`UPDATE reservation_transactions
      SET status = 'confirmed', payment_status = 'paid', payment_reference = ?, reservation_expires_at = datetime('now', '+72 hours'), updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND buyer_user_id = ? AND status = 'payment_hold' AND hold_expires_at > CURRENT_TIMESTAMP`).bind(reference, id, session.user.id).run();
    if ((result.meta.changes ?? 0) === 0) {
      const existing = await database.prepare(`SELECT id, status, payment_status, reservation_expires_at FROM reservation_transactions WHERE id = ? AND buyer_user_id = ? LIMIT 1`).bind(id, session.user.id).first<{ id: string; status: string; payment_status: string; reservation_expires_at: string | null }>();
      if (existing?.status === 'confirmed') return Response.json({ reservationId: existing.id, status: existing.status, paymentStatus: existing.payment_status, reservationExpiresAt: existing.reservation_expires_at, duplicate: true });
      return Response.json({ error: 'hold_expired', message: 'Время на оплату истекло. Создайте новое бронирование.' }, { status: 409 });
    }
    await database.batch([
      database.prepare(`UPDATE units SET availability_status = 'reserved', updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT unit_id FROM reservation_transactions WHERE id = ?)` ).bind(id),
      database.prepare(`UPDATE listings SET status = 'reserved', updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT listing_id FROM reservation_transactions WHERE id = ?)` ).bind(id),
      database.prepare(`UPDATE leads SET status = 'reservation', updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT lead_id FROM reservation_transactions WHERE id = ?)` ).bind(id),
      database.prepare(`INSERT INTO lead_activities (id, lead_id, actor_type, actor_id, activity_type, metadata_json) VALUES (?, (SELECT lead_id FROM reservation_transactions WHERE id = ?), 'buyer', ?, 'reservation.payment_confirmed', ?)`)
        .bind(crypto.randomUUID(), id, session.user.id, JSON.stringify({ paymentReference: reference, mode: 'sandbox' })),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'reservation.confirmed', 'reservation', ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, id, JSON.stringify({ paymentReference: reference, mode: 'sandbox' })),
    ]);
    const reservation = await database.prepare(`SELECT reservation_expires_at FROM reservation_transactions WHERE id = ?`).bind(id).first<{ reservation_expires_at: string }>();
    return Response.json({ reservationId: id, status: 'confirmed', paymentStatus: 'paid', reservationExpiresAt: reservation?.reservation_expires_at, mode: 'sandbox' });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to confirm reservation', error);
    return Response.json({ error: 'payment_confirmation_failed', message: 'Не удалось подтвердить оплату. Повторите попытку.' }, { status: 500 });
  }
}
