import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { paymentProvider } from '@/lib/payment-provider';
import { onlinePaymentsDisabledResponse, onlinePaymentsEnabled } from '@/lib/payment-mode';

export const dynamic = 'force-dynamic';

type ReservationPaymentRow = {
  id: string;
  status: string;
  payment_status: string;
  reservation_fee_uzs: number;
  hold_expires_at: string;
  reservation_expires_at: string | null;
};

type ExistingOperation = { reservation_id: string; status: string };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!onlinePaymentsEnabled()) return onlinePaymentsDisabledResponse();
  try {
    const session = await getAppSession(request);
    const { id } = await params;
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
      return Response.json({ error: 'idempotency_required', message: 'Не удалось безопасно подтвердить оплату.' }, { status: 400 });
    }

    const database = await ensureMarketplaceDatabase();
    const existingOperation = await database.prepare(`SELECT reservation_id, status FROM payment_operations WHERE idempotency_key = ? LIMIT 1`)
      .bind(idempotencyKey).first<ExistingOperation>();
    if (existingOperation && existingOperation.reservation_id !== id) {
      return Response.json({ error: 'idempotency_conflict', message: 'Этот ключ оплаты уже использован.' }, { status: 409 });
    }

    const reservation = await database.prepare(`SELECT id, status, payment_status, reservation_fee_uzs, hold_expires_at, reservation_expires_at
      FROM reservation_transactions WHERE id = ? AND buyer_user_id = ? LIMIT 1`).bind(id, session.user.id).first<ReservationPaymentRow>();
    if (!reservation) return Response.json({ error: 'not_found', message: 'Бронирование не найдено.' }, { status: 404 });
    if (existingOperation?.status === 'succeeded' || reservation.status === 'confirmed') {
      return Response.json({ reservationId: reservation.id, status: reservation.status, paymentStatus: reservation.payment_status, reservationExpiresAt: reservation.reservation_expires_at, duplicate: true });
    }
    if (reservation.status !== 'payment_hold' || new Date(`${reservation.hold_expires_at.replace(' ', 'T')}Z`).getTime() <= Date.now()) {
      return Response.json({ error: 'hold_expired', message: 'Время на оплату истекло. Создайте новое бронирование.' }, { status: 409 });
    }

    const providerResult = await paymentProvider().confirmReservation({ reservationId: id, amountUzs: reservation.reservation_fee_uzs, idempotencyKey });
    const operationId = crypto.randomUUID();
    const result = await database.prepare(`UPDATE reservation_transactions
      SET status = 'confirmed', payment_status = 'paid', payment_reference = ?, reservation_expires_at = datetime('now', '+72 hours'), updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND buyer_user_id = ? AND status = 'payment_hold' AND hold_expires_at > CURRENT_TIMESTAMP`)
      .bind(providerResult.reference, id, session.user.id).run();
    if ((result.meta.changes ?? 0) === 0) {
      await database.prepare(`INSERT OR IGNORE INTO payment_operations
        (id, reservation_id, operation_type, provider, provider_reference, amount_uzs, status, idempotency_key, metadata_json)
        VALUES (?, ?, 'reservation_payment', ?, ?, ?, 'manual_review', ?, ?)`)
        .bind(operationId, id, providerResult.provider, providerResult.reference, reservation.reservation_fee_uzs, idempotencyKey, JSON.stringify({ reason: 'reservation_state_changed' })).run();
      return Response.json({ error: 'reconciliation_required', message: 'Оплата отправлена на ручную сверку. Статус брони не изменён.' }, { status: 409 });
    }

    await database.batch([
      database.prepare(`INSERT INTO payment_operations
        (id, reservation_id, operation_type, provider, provider_reference, amount_uzs, status, idempotency_key, metadata_json)
        VALUES (?, ?, 'reservation_payment', ?, ?, ?, 'succeeded', ?, ?)`)
        .bind(operationId, id, providerResult.provider, providerResult.reference, reservation.reservation_fee_uzs, idempotencyKey, JSON.stringify({ mode: 'sandbox' })),
      database.prepare(`UPDATE units SET availability_status = 'reserved', updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT unit_id FROM reservation_transactions WHERE id = ?)` ).bind(id),
      database.prepare(`UPDATE listings SET status = 'reserved', updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT listing_id FROM reservation_transactions WHERE id = ?)` ).bind(id),
      database.prepare(`UPDATE leads SET status = 'reservation', updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT lead_id FROM reservation_transactions WHERE id = ?)` ).bind(id),
      database.prepare(`INSERT INTO lead_activities (id, lead_id, actor_type, actor_id, activity_type, metadata_json) VALUES (?, (SELECT lead_id FROM reservation_transactions WHERE id = ?), 'buyer', ?, 'reservation.payment_confirmed', ?)`)
        .bind(crypto.randomUUID(), id, session.user.id, JSON.stringify({ paymentReference: providerResult.reference, provider: providerResult.provider })),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'reservation.confirmed', 'reservation', ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, id, JSON.stringify({ paymentOperationId: operationId, paymentReference: providerResult.reference, provider: providerResult.provider })),
    ]);
    const confirmed = await database.prepare(`SELECT reservation_expires_at FROM reservation_transactions WHERE id = ?`).bind(id).first<{ reservation_expires_at: string }>();
    return Response.json({ reservationId: id, paymentOperationId: operationId, status: 'confirmed', paymentStatus: 'paid', reservationExpiresAt: confirmed?.reservation_expires_at, provider: providerResult.provider });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to confirm reservation', error);
    return Response.json({ error: 'payment_confirmation_failed', message: 'Не удалось подтвердить оплату. Повторите попытку.' }, { status: 500 });
  }
}
