import { authorizationResponse, requirePermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { paymentProvider } from '@/lib/payment-provider';

export const dynamic = 'force-dynamic';

type DisputeRow = {
  id: string;
  reservation_id: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  reservation_fee_uzs: number;
  reservation_status: string;
  payment_status: string;
  unit_id: string;
  listing_id: string;
  lead_id: string;
  buyer_name: string;
  buyer_email: string;
  complex_name: string;
  unit_number: string;
  developer_name: string;
};

async function loadDisputes(database: D1Database) {
  const result = await database.prepare(`SELECT dispute.id, dispute.reservation_id, dispute.category, dispute.description,
    dispute.status, dispute.priority, dispute.resolution_note, dispute.created_at, dispute.updated_at,
    reservation.reservation_fee_uzs, reservation.status AS reservation_status, reservation.payment_status,
    reservation.unit_id, reservation.listing_id, reservation.lead_id,
    customer.full_name AS buyer_name, customer.email AS buyer_email, complex.name AS complex_name,
    unit.unit_number, organization.name AS developer_name
    FROM reservation_disputes dispute
    JOIN reservation_transactions reservation ON reservation.id = dispute.reservation_id
    JOIN crm_customers customer ON customer.id = reservation.customer_id
    JOIN complexes complex ON complex.id = reservation.complex_id
    JOIN units unit ON unit.id = reservation.unit_id
    JOIN organizations organization ON organization.id = reservation.organization_id
    ORDER BY CASE dispute.status WHEN 'open' THEN 0 WHEN 'in_review' THEN 1 ELSE 2 END,
      CASE dispute.priority WHEN 'high' THEN 0 ELSE 1 END, dispute.created_at ASC LIMIT 100`).all<DisputeRow>();
  const disputes = result.results ?? [];
  return {
    disputes,
    stats: {
      active: disputes.filter((item) => ['open', 'in_review'].includes(item.status)).length,
      highPriority: disputes.filter((item) => ['open', 'in_review'].includes(item.status) && item.priority === 'high').length,
      refunded: disputes.filter((item) => item.status === 'resolved_refund').length,
      rejected: disputes.filter((item) => item.status === 'resolved_no_refund').length,
    },
  };
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, 'VIEW_ADMIN');
    const database = await ensureMarketplaceDatabase();
    return Response.json(await loadDisputes(database), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to load reservation disputes', error);
    return Response.json({ error: 'disputes_unavailable', message: 'Не удалось загрузить споры по бронированиям.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission(request, 'MANAGE_FINANCE');
    const payload = await request.json() as Record<string, unknown>;
    const disputeId = typeof payload.disputeId === 'string' ? payload.disputeId : '';
    const action = payload.action === 'start_review' || payload.action === 'approve_refund' || payload.action === 'reject' ? payload.action : '';
    const note = typeof payload.note === 'string' ? payload.note.trim().slice(0, 1000) : '';
    if (!disputeId || !action) return Response.json({ error: 'validation_failed', message: 'Не выбрано решение по спору.' }, { status: 400 });
    if (action !== 'start_review' && note.length < 5) return Response.json({ error: 'note_required', message: 'Добавьте комментарий к финансовому решению.' }, { status: 400 });

    const database = await ensureMarketplaceDatabase();
    const dispute = await database.prepare(`SELECT dispute.id, dispute.reservation_id, dispute.category, dispute.description,
      dispute.status, dispute.priority, dispute.resolution_note, dispute.created_at, dispute.updated_at,
      reservation.reservation_fee_uzs, reservation.status AS reservation_status, reservation.payment_status,
      reservation.unit_id, reservation.listing_id, reservation.lead_id,
      customer.full_name AS buyer_name, customer.email AS buyer_email, complex.name AS complex_name,
      unit.unit_number, organization.name AS developer_name
      FROM reservation_disputes dispute
      JOIN reservation_transactions reservation ON reservation.id = dispute.reservation_id
      JOIN crm_customers customer ON customer.id = reservation.customer_id
      JOIN complexes complex ON complex.id = reservation.complex_id
      JOIN units unit ON unit.id = reservation.unit_id
      JOIN organizations organization ON organization.id = reservation.organization_id
      WHERE dispute.id = ? LIMIT 1`).bind(disputeId).first<DisputeRow>();
    if (!dispute) return Response.json({ error: 'not_found', message: 'Спор не найден.' }, { status: 404 });
    if (!['open', 'in_review'].includes(dispute.status)) return Response.json({ error: 'already_resolved', message: 'По этому спору уже принято решение.' }, { status: 409 });

    if (action === 'start_review') {
      await database.batch([
        database.prepare(`UPDATE reservation_disputes SET status = 'in_review', assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('open', 'in_review')`).bind(session.user.id, disputeId),
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
          VALUES (?, 'user', ?, 'reservation.dispute_review_started', 'reservation_dispute', ?, ?)`)
          .bind(crypto.randomUUID(), session.user.id, disputeId, JSON.stringify({ reservationId: dispute.reservation_id, previousStatus: dispute.status })),
      ]);
      return Response.json({ disputeId, status: 'in_review', message: 'Спор взят в работу.' });
    }

    if (action === 'reject') {
      await database.batch([
        database.prepare(`UPDATE reservation_disputes SET status = 'resolved_no_refund', assigned_to = ?, resolution_note = ?, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .bind(session.user.id, note, disputeId),
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
          VALUES (?, 'user', ?, 'reservation.dispute_resolved_no_refund', 'reservation_dispute', ?, ?)`)
          .bind(crypto.randomUUID(), session.user.id, disputeId, JSON.stringify({ reservationId: dispute.reservation_id, previousStatus: dispute.status, note })),
      ]);
      return Response.json({ disputeId, status: 'resolved_no_refund', message: 'Спор закрыт без возврата.' });
    }

    if (!['paid', 'refunded'].includes(dispute.payment_status)) {
      return Response.json({ error: 'invalid_payment_state', message: 'Возврат невозможен: оплата брони не подтверждена.' }, { status: 409 });
    }
    const refundKey = `dispute-refund:${dispute.id}`;
    const alreadyRefunded = dispute.payment_status === 'refunded';
    const statements: D1PreparedStatement[] = [];
    let refundOperationId: string | null = null;
    let refundReference: string | null = null;
    if (!alreadyRefunded) {
      const refund = await paymentProvider().refundReservation({ reservationId: dispute.reservation_id, amountUzs: dispute.reservation_fee_uzs, idempotencyKey: refundKey });
      refundOperationId = crypto.randomUUID();
      refundReference = refund.reference;
      statements.push(database.prepare(`INSERT OR IGNORE INTO payment_operations
        (id, reservation_id, operation_type, provider, provider_reference, amount_uzs, status, idempotency_key, metadata_json)
        VALUES (?, ?, 'refund', ?, ?, ?, 'succeeded', ?, ?)`)
        .bind(refundOperationId, dispute.reservation_id, refund.provider, refund.reference, dispute.reservation_fee_uzs, refundKey, JSON.stringify({ reason: 'admin_dispute_refund', disputeId })));
      statements.push(database.prepare(`UPDATE reservation_transactions SET status = 'refunded', payment_status = 'refunded', cancellation_reason = 'admin_dispute_refund', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(dispute.reservation_id));
      statements.push(database.prepare(`INSERT INTO reservation_outcomes (reservation_id, outcome_status)
        VALUES (?, 'cancelled_admin') ON CONFLICT(reservation_id) DO UPDATE SET outcome_status = 'cancelled_admin', updated_at = CURRENT_TIMESTAMP`).bind(dispute.reservation_id));
      statements.push(database.prepare(`UPDATE units SET availability_status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND availability_status IN ('held', 'reserved')`).bind(dispute.unit_id));
      statements.push(database.prepare(`UPDATE listings SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'reserved'`).bind(dispute.listing_id));
      statements.push(database.prepare(`UPDATE leads SET status = 'lost', lost_reason = 'admin_dispute_refund', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(dispute.lead_id));
      statements.push(database.prepare(`INSERT INTO lead_activities (id, lead_id, actor_type, actor_id, activity_type, metadata_json)
        VALUES (?, ?, 'user', ?, 'reservation.dispute_refund', ?)`)
        .bind(crypto.randomUUID(), dispute.lead_id, session.user.id, JSON.stringify({ disputeId, refundOperationId, refundReference, amountUzs: dispute.reservation_fee_uzs })));
    }
    statements.push(database.prepare(`UPDATE reservation_disputes SET status = 'resolved_refund', assigned_to = ?, resolution_note = ?, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(session.user.id, note, disputeId));
    statements.push(database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
      VALUES (?, 'user', ?, 'reservation.dispute_resolved_refund', 'reservation_dispute', ?, ?)`)
      .bind(crypto.randomUUID(), session.user.id, disputeId, JSON.stringify({ reservationId: dispute.reservation_id, previousStatus: dispute.status, note, alreadyRefunded, refundOperationId, refundReference, amountUzs: dispute.reservation_fee_uzs })));
    await database.batch(statements);
    return Response.json({ disputeId, status: 'resolved_refund', refundOperationId, message: alreadyRefunded ? 'Спор закрыт: ранее выполненный возврат подтверждён.' : 'Полный возврат проведён, спор закрыт.' });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to update reservation dispute', error);
    return Response.json({ error: 'dispute_update_failed', message: 'Не удалось сохранить решение по спору.' }, { status: 500 });
  }
}
