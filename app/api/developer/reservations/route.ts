import { authorizationResponse, requirePermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { paymentProvider } from '@/lib/payment-provider';
import { localSandboxEnabled } from '@/lib/local-sandbox';

export const dynamic = 'force-dynamic';

type ReservationRow = {
  id: string;
  status: string;
  payment_status: string;
  outcome_status: string;
  unit_id: string;
  listing_id: string;
  lead_id: string;
  reservation_fee_uzs: number;
  payment_reference: string | null;
};

const allowedActions = new Set(['visit_completed', 'deal_in_progress', 'sold', 'extend', 'buyer_refused', 'developer_refused']);

async function releaseExpiredReservations(database: D1Database, organizationId: string) {
  await database.batch([
    database.prepare(`UPDATE reservation_transactions SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = ? AND status = 'payment_hold' AND hold_expires_at <= CURRENT_TIMESTAMP`).bind(organizationId),
    database.prepare(`UPDATE reservation_transactions SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = ? AND status = 'confirmed' AND reservation_expires_at <= CURRENT_TIMESTAMP
        AND COALESCE((SELECT outcome_status FROM reservation_outcomes WHERE reservation_id = reservation_transactions.id), 'active') = 'active'`).bind(organizationId),
    database.prepare(`UPDATE units SET availability_status = 'available', updated_at = CURRENT_TIMESTAMP
      WHERE id IN (SELECT unit_id FROM reservation_transactions WHERE organization_id = ? AND status = 'expired')
        AND availability_status IN ('held', 'reserved')
        AND NOT EXISTS (SELECT 1 FROM reservation_transactions active WHERE active.unit_id = units.id AND active.status IN ('payment_hold', 'confirmed'))`).bind(organizationId),
    database.prepare(`UPDATE listings SET status = 'published', updated_at = CURRENT_TIMESTAMP
      WHERE id IN (SELECT listing_id FROM reservation_transactions WHERE organization_id = ? AND status = 'expired') AND status = 'reserved'`).bind(organizationId),
  ]);
}

export async function GET(request: Request) {
  try {
    const session = await requirePermission(request, 'VIEW_DEVELOPER_DASHBOARD');
    if (!session.organization) return Response.json({ reservations: [], stats: { active: 0, holds: 0, deals: 0, total: 0 } });
    const database = await ensureMarketplaceDatabase();
    await releaseExpiredReservations(database, session.organization.id);
    const result = await database.prepare(`SELECT reservation.id, reservation.status, reservation.payment_status, reservation.payment_reference,
      COALESCE(outcome.outcome_status, 'active') AS outcome_status, outcome.extension_reason, outcome.extended_at,
      reservation.price_uzs, reservation.reservation_fee_uzs, reservation.hold_expires_at, reservation.reservation_expires_at,
      reservation.created_at, customer.full_name AS buyer_name, customer.phone_e164 AS buyer_phone, customer.email AS buyer_email,
      complex.name AS complex_name, complex.slug, unit.unit_number, unit.rooms, unit.area_sqm
      FROM reservation_transactions reservation
      JOIN crm_customers customer ON customer.id = reservation.customer_id
      JOIN complexes complex ON complex.id = reservation.complex_id
      JOIN units unit ON unit.id = reservation.unit_id
      LEFT JOIN reservation_outcomes outcome ON outcome.reservation_id = reservation.id
      WHERE reservation.organization_id = ?
      ORDER BY CASE reservation.status WHEN 'confirmed' THEN 0 WHEN 'payment_hold' THEN 1 ELSE 2 END,
        COALESCE(reservation.reservation_expires_at, reservation.hold_expires_at) ASC, reservation.created_at DESC
      LIMIT 100`).bind(session.organization.id).all();
    const reservations = result.results ?? [];
    return Response.json({
      reservations,
      stats: {
        active: reservations.filter((item) => item.status === 'confirmed' && !['buyer_refused', 'developer_refused', 'sold', 'cancelled_admin'].includes(String(item.outcome_status))).length,
        holds: reservations.filter((item) => item.status === 'payment_hold').length,
        deals: reservations.filter((item) => item.outcome_status === 'deal_in_progress').length,
        total: reservations.length,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to load developer reservations', error);
    return Response.json({ error: 'reservations_unavailable', message: 'Не удалось загрузить бронирования.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission(request, 'MANAGE_LEADS');
    if (!session.organization) return Response.json({ error: 'organization_required', message: 'Не найден профиль компании.' }, { status: 409 });
    const payload = await request.json() as Record<string, unknown>;
    const reservationId = typeof payload.reservationId === 'string' ? payload.reservationId : '';
    const action = typeof payload.action === 'string' && allowedActions.has(payload.action) ? payload.action : '';
    const reason = typeof payload.reason === 'string' ? payload.reason.trim().slice(0, 250) : '';
    const newExpiry = typeof payload.newExpiry === 'string' ? payload.newExpiry : '';
    if (!reservationId || !action) return Response.json({ error: 'validation_failed', message: 'Не выбрано действие с бронью.' }, { status: 400 });
    if (action === 'extend') {
      const expiry = new Date(newExpiry);
      const maximum = Date.now() + 30 * 24 * 60 * 60 * 1000;
      if (reason.length < 3 || Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now() || expiry.getTime() > maximum) {
        return Response.json({ error: 'validation_failed', message: 'Укажите причину и новый срок в пределах 30 дней.' }, { status: 400 });
      }
    }

    const database = await ensureMarketplaceDatabase();
    const reservation = await database.prepare(`SELECT reservation.id, reservation.status, reservation.payment_status, reservation.payment_reference,
      COALESCE(outcome.outcome_status, 'active') AS outcome_status, reservation.unit_id, reservation.listing_id, reservation.lead_id, reservation.reservation_fee_uzs
      FROM reservation_transactions reservation
      LEFT JOIN reservation_outcomes outcome ON outcome.reservation_id = reservation.id
      WHERE reservation.id = ? AND reservation.organization_id = ? LIMIT 1`).bind(reservationId, session.organization.id).first<ReservationRow>();
    if (!reservation) return Response.json({ error: 'not_found', message: 'Бронирование не найдено.' }, { status: 404 });
    if (reservation.status !== 'confirmed') return Response.json({ error: 'invalid_state', message: 'Действие доступно только для активной брони.' }, { status: 409 });
    if (['buyer_refused', 'developer_refused', 'sold', 'cancelled_admin'].includes(reservation.outcome_status)) return Response.json({ error: 'closed_reservation', message: 'Бронирование уже закрыто.' }, { status: 409 });
    const isDemo = reservation.payment_reference?.startsWith('LOCAL-DEMO-') ?? false;
    if (action === 'sold' && reservation.outcome_status !== 'deal_in_progress') return Response.json({ error: 'invalid_state', message: 'Сначала переведите бронь в сделку.' }, { status: 409 });
    if (action === 'sold' && isDemo && !localSandboxEnabled(request)) return Response.json({ error: 'unavailable', message: 'Завершить тестовую сделку можно только на localhost.' }, { status: 403 });
    if (action === 'sold' && !isDemo && reservation.payment_status !== 'paid') return Response.json({ error: 'payment_required', message: 'Нельзя завершить сделку без подтверждённой оплаты брони.' }, { status: 409 });

    const activityMetadata = action === 'extend' ? { reason, newExpiry } : { previousOutcome: reservation.outcome_status };
    const statements: D1PreparedStatement[] = [];
    let refundMetadata: Record<string, unknown> = {};
    if (action === 'developer_refused' && !isDemo) {
      const refundKey = `developer-refund:${reservation.id}`;
      const refund = await paymentProvider().refundReservation({ reservationId: reservation.id, amountUzs: reservation.reservation_fee_uzs, idempotencyKey: refundKey });
      const refundOperationId = crypto.randomUUID();
      statements.push(database.prepare(`INSERT OR IGNORE INTO payment_operations
        (id, reservation_id, operation_type, provider, provider_reference, amount_uzs, status, idempotency_key, metadata_json)
        VALUES (?, ?, 'refund', ?, ?, ?, 'succeeded', ?, ?)`)
        .bind(refundOperationId, reservation.id, refund.provider, refund.reference, reservation.reservation_fee_uzs, refundKey, JSON.stringify({ reason: 'developer_refused' })));
      refundMetadata = { refundOperationId, refundReference: refund.reference, provider: refund.provider, amountUzs: reservation.reservation_fee_uzs };
    }
    if (action === 'extend') {
      statements.push(database.prepare(`UPDATE reservation_transactions SET reservation_expires_at = datetime(?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(newExpiry, reservation.id));
      statements.push(database.prepare(`INSERT INTO reservation_outcomes (reservation_id, outcome_status, extension_reason, extended_by, extended_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(reservation_id) DO UPDATE SET extension_reason = excluded.extension_reason, extended_by = excluded.extended_by, extended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`)
        .bind(reservation.id, reservation.outcome_status, reason, session.user.id));
    } else {
      statements.push(database.prepare(`INSERT INTO reservation_outcomes (reservation_id, outcome_status)
        VALUES (?, ?) ON CONFLICT(reservation_id) DO UPDATE SET outcome_status = excluded.outcome_status, updated_at = CURRENT_TIMESTAMP`).bind(reservation.id, action));
    }
    if (action === 'visit_completed') statements.push(database.prepare(`UPDATE leads SET status = 'viewing_completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(reservation.lead_id));
    if (action === 'deal_in_progress') statements.push(database.prepare(`UPDATE leads SET status = 'deal_in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(reservation.lead_id));
    if (action === 'sold') {
      statements.push(database.prepare(`UPDATE leads SET status = 'won', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(reservation.lead_id));
      statements.push(database.prepare(`UPDATE units SET availability_status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND availability_status = 'reserved'`).bind(reservation.unit_id));
      statements.push(database.prepare(`UPDATE listings SET status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'reserved'`).bind(reservation.listing_id));
    }
    if (action === 'buyer_refused' || action === 'developer_refused') {
      statements.push(database.prepare(`UPDATE reservation_transactions SET status = ?, payment_status = ?, cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(action === 'developer_refused' && !isDemo ? 'refunded' : 'cancelled', isDemo ? 'awaiting_payment' : action === 'developer_refused' ? 'refunded' : 'paid', action, reservation.id));
      statements.push(database.prepare(`UPDATE units SET availability_status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND availability_status = 'reserved'`).bind(reservation.unit_id));
      statements.push(database.prepare(`UPDATE listings SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'reserved'`).bind(reservation.listing_id));
      statements.push(database.prepare(`UPDATE leads SET status = 'lost', lost_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(action, reservation.lead_id));
    }
    const actionMetadata = { ...activityMetadata, ...refundMetadata };
    statements.push(database.prepare(`INSERT INTO lead_activities (id, lead_id, actor_type, actor_id, activity_type, metadata_json) VALUES (?, ?, 'user', ?, ?, ?)`)
      .bind(crypto.randomUUID(), reservation.lead_id, session.user.id, `reservation.${action}`, JSON.stringify(actionMetadata)));
    statements.push(database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, ?, 'reservation', ?, ?)`)
      .bind(crypto.randomUUID(), session.user.id, `reservation.${action}`, reservation.id, JSON.stringify(actionMetadata)));
    await database.batch(statements);
    const messages: Record<string, string> = { visit_completed: 'Визит отмечен завершённым.', deal_in_progress: 'Бронь переведена в сделку.', sold: isDemo ? 'Тестовая сделка завершена. Квартира отмечена как проданная.' : 'Сделка завершена. Квартира отмечена как проданная.', extend: 'Срок брони продлён.', buyer_refused: 'Отказ покупателя зарегистрирован.', developer_refused: isDemo ? 'Тестовая бронь отменена без возврата: оплаты не было.' : 'Отмена застройщика зарегистрирована, возврат проведён через платёжный контур.' };
    return Response.json({ reservationId, action, message: messages[action] });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to update developer reservation', error);
    return Response.json({ error: 'reservation_update_failed', message: 'Не удалось обновить бронирование.' }, { status: 500 });
  }
}
