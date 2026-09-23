import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { localSandboxEnabled } from '@/lib/local-sandbox';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return Response.json({ enabled: localSandboxEnabled(request) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!localSandboxEnabled(request)) return Response.json({ error: 'unavailable', message: 'Тестовая бронь доступна только на localhost.' }, { status: 403 });
  try {
    const session = await getAppSession(request);
    if (session.organization || session.platformRoles.length || session.phoneVerification.status !== 'verified' || !session.phoneVerification.phone) {
      return Response.json({ error: 'buyer_required', message: 'Войдите как покупатель с подтверждённым телефоном.' }, { status: 403 });
    }
    const key = request.headers.get('Idempotency-Key')?.trim() ?? '';
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(key)) return Response.json({ error: 'idempotency_required', message: 'Обновите страницу и повторите попытку.' }, { status: 400 });
    const body = await request.json() as { listingId?: unknown };
    const listingId = typeof body.listingId === 'string' ? body.listingId : '';
    if (!listingId) return Response.json({ error: 'listing_required', message: 'Выберите квартиру.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const existing = await database.prepare(`SELECT id, status FROM reservation_transactions WHERE buyer_user_id = ? AND idempotency_key = ? LIMIT 1`).bind(session.user.id, key).first<{ id: string; status: string }>();
    if (existing) return Response.json({ reservationId: existing.id, status: existing.status, duplicate: true });

    // Release expired test reservations before checking availability.
    await database.batch([
      database.prepare(`UPDATE reservation_transactions SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE status = 'confirmed' AND payment_reference LIKE 'LOCAL-DEMO-%' AND reservation_expires_at <= CURRENT_TIMESTAMP`),
      database.prepare(`UPDATE units SET availability_status = 'available', updated_at = CURRENT_TIMESTAMP WHERE availability_status = 'reserved' AND id IN (SELECT unit_id FROM reservation_transactions WHERE status = 'expired' AND payment_reference LIKE 'LOCAL-DEMO-%') AND NOT EXISTS (SELECT 1 FROM reservation_transactions active WHERE active.unit_id = units.id AND active.status IN ('payment_hold', 'confirmed'))`),
      database.prepare(`UPDATE listings SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE status = 'reserved' AND id IN (SELECT listing_id FROM reservation_transactions WHERE status = 'expired' AND payment_reference LIKE 'LOCAL-DEMO-%') AND NOT EXISTS (SELECT 1 FROM reservation_transactions active WHERE active.listing_id = listings.id AND active.status IN ('payment_hold', 'confirmed'))`),
    ]);
    const listing = await database.prepare(`SELECT l.id, l.unit_id, l.complex_id, l.seller_org_id, l.price_uzs FROM listings l JOIN units u ON u.id = l.unit_id JOIN complexes c ON c.id = l.complex_id JOIN complex_publication_workflows w ON w.complex_id = c.id JOIN organizations o ON o.id = l.seller_org_id WHERE l.id = ? AND l.market_type = 'PRIMARY_DEVELOPER' AND l.reserve_enabled = 1 AND l.status = 'published' AND u.availability_status = 'available' AND c.verification_status = 'verified' AND w.status = 'published' AND o.verification_status = 'verified' LIMIT 1`).bind(listingId).first<{ id: string; unit_id: string; complex_id: string; seller_org_id: string; price_uzs: number }>();
    if (!listing) return Response.json({ error: 'listing_unavailable', message: 'Квартира уже недоступна для бронирования.' }, { status: 409 });

    let customer = await database.prepare(`SELECT id FROM crm_customers WHERE organization_id = ? AND buyer_user_id = ? LIMIT 1`).bind(listing.seller_org_id, session.user.id).first<{ id: string }>();
    if (!customer) customer = await database.prepare(`SELECT id FROM crm_customers WHERE organization_id = ? AND phone_e164 = ? LIMIT 1`).bind(listing.seller_org_id, session.phoneVerification.phone).first<{ id: string }>();
    if (!customer) {
      const id = crypto.randomUUID();
      await database.prepare(`INSERT OR IGNORE INTO crm_customers (id, organization_id, buyer_user_id, full_name, phone_e164, email, first_source) VALUES (?, ?, ?, ?, ?, ?, 'estatehub_reservation')`).bind(id, listing.seller_org_id, session.user.id, session.user.fullName, session.phoneVerification.phone, session.user.email).run();
      customer = await database.prepare(`SELECT id FROM crm_customers WHERE organization_id = ? AND phone_e164 = ? LIMIT 1`).bind(listing.seller_org_id, session.phoneVerification.phone).first<{ id: string }>();
    }
    if (!customer) throw new Error('Customer creation failed');
    const reservationId = crypto.randomUUID();
    const leadId = crypto.randomUUID();
    try {
      await database.batch([
        database.prepare(`INSERT INTO leads (id, customer_id, organization_id, complex_id, listing_id, lead_type, status, source, message, idempotency_key) VALUES (?, ?, ?, ?, ?, 'reservation', 'reservation', 'estatehub_reservation', 'Тестовая бронь без оплаты', ?)`).bind(leadId, customer.id, listing.seller_org_id, listing.complex_id, listingId, `demo-reservation:${key}`),
        database.prepare(`INSERT INTO reservation_transactions (id, listing_id, unit_id, complex_id, organization_id, buyer_user_id, customer_id, lead_id, idempotency_key, price_uzs, reservation_fee_uzs, status, payment_status, hold_expires_at, reservation_expires_at, payment_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2500000, 'confirmed', 'awaiting_payment', CURRENT_TIMESTAMP, datetime('now', '+72 hours'), ?)`).bind(reservationId, listingId, listing.unit_id, listing.complex_id, listing.seller_org_id, session.user.id, customer.id, leadId, key, listing.price_uzs, `LOCAL-DEMO-${reservationId}`),
        database.prepare(`UPDATE units SET availability_status = 'reserved', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND availability_status = 'available'`).bind(listing.unit_id),
        database.prepare(`UPDATE listings SET status = 'reserved', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'published'`).bind(listingId),
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'reservation.demo_created', 'reservation', ?, ?)`).bind(crypto.randomUUID(), session.user.id, reservationId, JSON.stringify({ listingId, expiresInHours: 72, paid: false })),
      ]);
    } catch (error) {
      console.error('Demo reservation conflict', error);
      return Response.json({ error: 'listing_unavailable', message: 'Квартиру уже бронирует другой покупатель.' }, { status: 409 });
    }
    return Response.json({ reservationId, status: 'confirmed', paymentStatus: 'awaiting_payment', demo: true, message: 'Тестовая бронь создана на 72 часа без оплаты.' }, { status: 201 });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'reservation_failed', message: 'Не удалось создать тестовую бронь.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!localSandboxEnabled(request)) return Response.json({ error: 'unavailable' }, { status: 403 });
  try {
    const session = await getAppSession(request);
    const body = await request.json() as { reservationId?: unknown };
    const id = typeof body.reservationId === 'string' ? body.reservationId : '';
    const database = await ensureMarketplaceDatabase();
    const reservation = await database.prepare(`SELECT id, unit_id, listing_id, lead_id FROM reservation_transactions WHERE id = ? AND buyer_user_id = ? AND status = 'confirmed' AND payment_reference LIKE 'LOCAL-DEMO-%' LIMIT 1`).bind(id, session.user.id).first<{ id: string; unit_id: string; listing_id: string; lead_id: string }>();
    if (!reservation) return Response.json({ error: 'not_found', message: 'Активная тестовая бронь не найдена.' }, { status: 404 });
    await database.batch([
      database.prepare(`UPDATE reservation_transactions SET status = 'cancelled', cancellation_reason = 'buyer_demo_cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(id),
      database.prepare(`UPDATE units SET availability_status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND availability_status = 'reserved' AND NOT EXISTS (SELECT 1 FROM reservation_transactions active WHERE active.unit_id = units.id AND active.status IN ('payment_hold', 'confirmed'))`).bind(reservation.unit_id),
      database.prepare(`UPDATE listings SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'reserved' AND NOT EXISTS (SELECT 1 FROM reservation_transactions active WHERE active.listing_id = listings.id AND active.status IN ('payment_hold', 'confirmed'))`).bind(reservation.listing_id),
      database.prepare(`UPDATE leads SET status = 'lost', lost_reason = 'buyer_demo_cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(reservation.lead_id),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'reservation.demo_cancelled', 'reservation', ?, '{}')`).bind(crypto.randomUUID(), session.user.id, id),
    ]);
    return Response.json({ reservationId: id, status: 'cancelled', message: 'Тестовая бронь отменена, квартира снова доступна.' });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'cancel_failed', message: 'Не удалось отменить тестовую бронь.' }, { status: 500 });
  }
}
