import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

const reservationFeeUzs = 2_500_000;

function normalizeUzbekPhone(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 9) digits = `998${digits}`;
  return digits.length === 12 && digits.startsWith('998') ? `+${digits}` : null;
}

function validIdempotencyKey(value: string) {
  return /^[A-Za-z0-9._:-]{8,128}$/.test(value);
}

type ReservationRow = { id: string; status: string; payment_status: string; hold_expires_at: string; reservation_expires_at: string | null };

function responseForReservation(reservation: ReservationRow, duplicate = false) {
  return Response.json({
    reservationId: reservation.id,
    status: reservation.status,
    paymentStatus: reservation.payment_status,
    holdExpiresAt: reservation.hold_expires_at,
    reservationExpiresAt: reservation.reservation_expires_at,
    duplicate,
  }, { status: duplicate ? 200 : 201 });
}

export async function POST(request: Request) {
  try {
    const session = await getAppSession(request);
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
    if (!validIdempotencyKey(idempotencyKey)) return Response.json({ error: 'idempotency_required', message: 'Обновите страницу и повторите бронирование.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const identity = await database.prepare(`SELECT status FROM buyer_identity_verifications WHERE user_id = ? LIMIT 1`).bind(session.user.id).first<{ status: string }>();
    if (identity?.status !== 'verified') return Response.json({ error: 'verification_required', verificationStatus: identity?.status ?? 'not_started', message: 'Перед платным бронированием подтвердите личность в профиле.' }, { status: 409 });
    const body = await request.json() as Record<string, unknown>;
    const listingId = typeof body.listingId === 'string' ? body.listingId : '';
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const phone = normalizeUzbekPhone(typeof body.phone === 'string' ? body.phone : '');
    if (!listingId || fullName.length < 2 || fullName.length > 100 || !phone) {
      return Response.json({ error: 'validation_failed', message: 'Укажите имя и номер телефона в формате +998.' }, { status: 400 });
    }

    const existing = await database.prepare(`SELECT id, status, payment_status, hold_expires_at, reservation_expires_at
      FROM reservation_transactions WHERE idempotency_key = ? AND buyer_user_id = ? LIMIT 1`).bind(idempotencyKey, session.user.id).first<ReservationRow>();
    if (existing) return responseForReservation(existing, true);

    // Expired holds are released before a new attempt. The active-listing unique index still protects concurrent requests.
    await database.batch([
      database.prepare(`UPDATE reservation_transactions SET status = 'expired', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'payment_hold' AND hold_expires_at <= CURRENT_TIMESTAMP`),
      database.prepare(`UPDATE units SET availability_status = 'available', updated_at = CURRENT_TIMESTAMP
        WHERE availability_status = 'held' AND id IN (SELECT unit_id FROM reservation_transactions WHERE status = 'expired')
        AND NOT EXISTS (SELECT 1 FROM reservation_transactions active WHERE active.unit_id = units.id AND active.status IN ('payment_hold', 'confirmed'))`),
    ]);

    const listing = await database.prepare(`SELECT l.id, l.unit_id, l.complex_id, l.seller_org_id, l.price_uzs
      FROM listings l
      JOIN units u ON u.id = l.unit_id
      JOIN organizations o ON o.id = l.seller_org_id
      JOIN complex_publication_workflows workflow ON workflow.complex_id = l.complex_id
      WHERE l.id = ? AND l.market_type = 'PRIMARY_DEVELOPER' AND l.reserve_enabled = 1
        AND l.status = 'published' AND u.availability_status = 'available'
        AND o.verification_status = 'verified' AND workflow.status = 'published' LIMIT 1`)
      .bind(listingId).first<{ id: string; unit_id: string; complex_id: string; seller_org_id: string; price_uzs: number }>();
    if (!listing?.seller_org_id) return Response.json({ error: 'listing_unavailable', message: 'Квартира недоступна для онлайн-бронирования. Обновите страницу.' }, { status: 409 });

    let customer = await database.prepare(`SELECT id FROM crm_customers WHERE organization_id = ? AND phone_e164 = ? LIMIT 1`)
      .bind(listing.seller_org_id, phone).first<{ id: string }>();
    if (!customer) {
      const id = crypto.randomUUID();
      await database.prepare(`INSERT OR IGNORE INTO crm_customers (id, organization_id, buyer_user_id, full_name, phone_e164, email, first_source)
        VALUES (?, ?, ?, ?, ?, ?, 'estatehub_reservation')`).bind(id, listing.seller_org_id, session.user.id, fullName, phone, session.user.email).run();
      customer = await database.prepare(`SELECT id FROM crm_customers WHERE organization_id = ? AND phone_e164 = ? LIMIT 1`).bind(listing.seller_org_id, phone).first<{ id: string }>();
    } else {
      await database.prepare(`UPDATE crm_customers SET buyer_user_id = COALESCE(buyer_user_id, ?), full_name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(session.user.id, fullName, session.user.email, customer.id).run();
    }
    if (!customer) throw new Error('Customer could not be created');

    const reservationId = crypto.randomUUID();
    const leadId = crypto.randomUUID();
    const leadKey = `reservation:${idempotencyKey}`;
    try {
      await database.batch([
        database.prepare(`INSERT INTO leads (id, customer_id, organization_id, complex_id, listing_id, lead_type, status, source, message, idempotency_key)
          SELECT ?, ?, l.seller_org_id, l.complex_id, l.id, 'reservation', 'reservation', 'estatehub_reservation', 'Онлайн-бронирование: ожидание оплаты', ?
          FROM listings l JOIN units u ON u.id = l.unit_id
          WHERE l.id = ? AND l.market_type = 'PRIMARY_DEVELOPER' AND l.reserve_enabled = 1 AND l.status = 'published' AND u.availability_status = 'available'`)
          .bind(leadId, customer.id, leadKey, listingId),
        database.prepare(`INSERT INTO reservation_transactions (id, listing_id, unit_id, complex_id, organization_id, buyer_user_id, customer_id, lead_id, idempotency_key, price_uzs, reservation_fee_uzs, status, payment_status, hold_expires_at)
          SELECT ?, l.id, l.unit_id, l.complex_id, l.seller_org_id, ?, ?, ?, ?, l.price_uzs, ?, 'payment_hold', 'awaiting_payment', datetime('now', '+5 minutes')
          FROM listings l JOIN units u ON u.id = l.unit_id JOIN leads lead ON lead.id = ?
          WHERE l.id = ? AND l.market_type = 'PRIMARY_DEVELOPER' AND l.reserve_enabled = 1 AND l.status = 'published' AND u.availability_status = 'available'`)
          .bind(reservationId, session.user.id, customer.id, leadId, idempotencyKey, reservationFeeUzs, leadId, listingId),
        database.prepare(`UPDATE units SET availability_status = 'held', updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND availability_status = 'available' AND EXISTS (SELECT 1 FROM reservation_transactions WHERE id = ? AND status = 'payment_hold')`)
          .bind(listing.unit_id, reservationId),
        database.prepare(`INSERT INTO lead_activities (id, lead_id, actor_type, actor_id, activity_type, metadata_json)
          SELECT ?, ?, 'buyer', ?, 'reservation.hold_created', ? WHERE EXISTS (SELECT 1 FROM reservation_transactions WHERE id = ?)`)
          .bind(crypto.randomUUID(), leadId, session.user.id, JSON.stringify({ listingId, priceUzs: listing.price_uzs, reservationFeeUzs }), reservationId),
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
          SELECT ?, 'user', ?, 'reservation.hold_created', 'reservation', ?, ? WHERE EXISTS (SELECT 1 FROM reservation_transactions WHERE id = ?)`)
          .bind(crypto.randomUUID(), session.user.id, reservationId, JSON.stringify({ listingId, priceUzs: listing.price_uzs, reservationFeeUzs }), reservationId),
      ]);
    } catch (error) {
      console.error('Reservation hold conflict', error);
      return Response.json({ error: 'listing_unavailable', message: 'Эту квартиру уже удерживает другой покупатель. Выберите другую.' }, { status: 409 });
    }

    const reservation = await database.prepare(`SELECT id, status, payment_status, hold_expires_at, reservation_expires_at FROM reservation_transactions WHERE id = ? AND buyer_user_id = ? LIMIT 1`)
      .bind(reservationId, session.user.id).first<ReservationRow>();
    if (!reservation) return Response.json({ error: 'listing_unavailable', message: 'Квартира только что стала недоступна. Выберите другую.' }, { status: 409 });
    return responseForReservation(reservation);
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to create reservation', error);
    return Response.json({ error: 'reservation_creation_failed', message: 'Не удалось создать удержание. Попробуйте ещё раз.' }, { status: 500 });
  }
}
