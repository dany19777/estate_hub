import { authorizationResponse, requireVerifiedPhone } from '@/lib/auth';
import { addDays, databaseNow } from '@/lib/billing';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { paymentProvider } from '@/lib/payment-provider';

export const dynamic = 'force-dynamic';

const allowedFinishes = new Set(['Без отделки', 'Предчистовая', 'Чистовая', 'С ремонтом']);
const allowedDocuments = new Set(['ownership_certificate', 'power_of_attorney']);

function integer(value: unknown) { const parsed = Number(value); return Number.isInteger(parsed) ? parsed : null; }
function decimal(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function validKey(value: string) { return /^[A-Za-z0-9._:-]{8,128}$/.test(value); }

async function payload(database: D1Database, userId: string) {
  const [listingResult, complexResult, config] = await Promise.all([
    database.prepare(`SELECT listing.id, listing.status, listing.price_uzs, listing.published_at, listing.expires_at,
      complex.id AS complex_id, complex.slug, complex.name AS complex_name, complex.hero_image_url AS image,
      unit.unit_number, unit.rooms, unit.area_sqm, unit.floor_number, unit.total_floors, unit.finish, unit.availability_status,
      owner.contact_phone, owner.document_type, owner.document_reference, owner.verification_status, owner.rejection_reason,
      (SELECT purchase.period_end FROM secondary_listing_purchases purchase WHERE purchase.listing_id = listing.id AND purchase.status = 'active' ORDER BY purchase.period_end DESC LIMIT 1) AS paid_until
      FROM secondary_listing_owners owner JOIN listings listing ON listing.id = owner.listing_id
      JOIN units unit ON unit.id = listing.unit_id JOIN complexes complex ON complex.id = listing.complex_id
      WHERE owner.seller_user_id = ? ORDER BY listing.created_at DESC`).bind(userId).all(),
    database.prepare(`SELECT complex.id, complex.name, complex.slug, district.name_ru AS district, building.id AS building_id, building.name AS building_name, building.total_floors
      FROM complexes complex JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id AND workflow.status = 'published'
      JOIN districts district ON district.id = complex.district_id JOIN buildings building ON building.complex_id = complex.id
      ORDER BY complex.name, building.name`).all(),
    database.prepare(`SELECT secondary_listing_fee_uzs, secondary_period_days FROM platform_billing_config WHERE id = 'default' LIMIT 1`).first<{ secondary_listing_fee_uzs: number; secondary_period_days: number }>(),
  ]);
  return { listings: listingResult.results ?? [], complexes: complexResult.results ?? [], billing: { feeUzs: Number(config?.secondary_listing_fee_uzs ?? 250_000), periodDays: Number(config?.secondary_period_days ?? 30) } };
}

export async function GET(request: Request) {
  try {
    const session = await requireVerifiedPhone(request);
    const database = await ensureMarketplaceDatabase();
    return Response.json(await payload(database, session.user.id), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'seller_listings_unavailable', message: 'Не удалось загрузить объявления продавца.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireVerifiedPhone(request);
    const body = await request.json() as Record<string, unknown>;
    const complexId = typeof body.complexId === 'string' ? body.complexId : '';
    const buildingId = typeof body.buildingId === 'string' ? body.buildingId : '';
    const unitNumber = typeof body.unitNumber === 'string' ? body.unitNumber.trim() : '';
    const rooms = integer(body.rooms), floorNumber = integer(body.floorNumber), totalFloors = integer(body.totalFloors), priceUzs = integer(body.priceUzs);
    const areaSqm = decimal(body.areaSqm);
    const finish = typeof body.finish === 'string' ? body.finish : '';
    const documentType = typeof body.documentType === 'string' && allowedDocuments.has(body.documentType) ? body.documentType : '';
    const documentReference = typeof body.documentReference === 'string' ? body.documentReference.trim().slice(0, 120) : '';
    if (!complexId || !buildingId || !unitNumber || unitNumber.length > 30 || !rooms || rooms < 1 || rooms > 10 || !floorNumber || floorNumber < 1 || !totalFloors || floorNumber > totalFloors || !areaSqm || areaSqm < 10 || areaSqm > 1000 || !priceUzs || priceUzs < 1_000_000 || !allowedFinishes.has(finish) || !documentType || documentReference.length < 5) return Response.json({ error: 'validation_failed', message: 'Проверьте ЖК, квартиру, этаж, площадь, цену и реквизиты документа.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const building = await database.prepare(`SELECT building.id, building.total_floors, complex.id AS complex_id
      FROM buildings building JOIN complexes complex ON complex.id = building.complex_id
      JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id AND workflow.status = 'published'
      WHERE building.id = ? AND complex.id = ? LIMIT 1`).bind(buildingId, complexId).first<{ id: string; total_floors: number; complex_id: string }>();
    if (!building || building.total_floors !== totalFloors) return Response.json({ error: 'building_mismatch', message: 'Корпус или количество этажей изменились. Обновите форму.' }, { status: 409 });
    const duplicate = await database.prepare(`SELECT unit.id FROM units unit JOIN listings listing ON listing.unit_id = unit.id WHERE unit.building_id = ? AND unit.unit_number = ? AND listing.status NOT IN ('rejected', 'expired', 'sold') LIMIT 1`).bind(buildingId, unitNumber).first();
    if (duplicate) return Response.json({ error: 'duplicate_listing', message: 'Для этой квартиры уже существует активное объявление.' }, { status: 409 });
    let section = await database.prepare(`SELECT id FROM sections WHERE building_id = ? ORDER BY created_at LIMIT 1`).bind(buildingId).first<{ id: string }>();
    if (!section) { const id = crypto.randomUUID(); await database.prepare(`INSERT INTO sections (id, building_id, name) VALUES (?, ?, 'Секция 1')`).bind(id, buildingId).run(); section = { id }; }
    let floor = await database.prepare(`SELECT id FROM floors WHERE section_id = ? AND floor_number = ? LIMIT 1`).bind(section.id, floorNumber).first<{ id: string }>();
    if (!floor) { const id = crypto.randomUUID(); await database.prepare(`INSERT INTO floors (id, section_id, floor_number) VALUES (?, ?, ?)`).bind(id, section.id, floorNumber).run(); floor = { id }; }
    const unitId = crypto.randomUUID(), listingId = crypto.randomUUID(), caseId = crypto.randomUUID();
    await database.batch([
      database.prepare(`INSERT INTO units (id, complex_id, building_id, section_id, floor_id, unit_number, rooms, area_sqm, floor_number, total_floors, finish, availability_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`).bind(unitId, complexId, buildingId, section.id, floor.id, unitNumber, rooms, areaSqm, floorNumber, totalFloors, finish),
      database.prepare(`INSERT INTO listings (id, unit_id, complex_id, market_type, seller_type, price_uzs, status, reserve_enabled) VALUES (?, ?, ?, 'SECONDARY_OWNER', 'owner', ?, 'pending_verification', 0)`).bind(listingId, unitId, complexId, priceUzs),
      database.prepare(`INSERT INTO secondary_listing_owners (listing_id, seller_user_id, contact_phone, document_type, document_reference) VALUES (?, ?, ?, ?, ?)`).bind(listingId, session.user.id, session.phoneVerification.phone, documentType, documentReference),
      database.prepare(`INSERT INTO verification_cases (id, subject_type, subject_id, status, risk_level) VALUES (?, 'listing', ?, 'submitted', 'medium')`).bind(caseId, listingId),
      database.prepare(`INSERT INTO listing_price_history (id, listing_id, old_price_uzs, new_price_uzs, reason, changed_by) VALUES (?, ?, NULL, ?, 'secondary_submission', ?)`).bind(crypto.randomUUID(), listingId, priceUzs, session.user.id),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'secondary_listing.submitted', 'listing', ?, ?)`).bind(crypto.randomUUID(), session.user.id, listingId, JSON.stringify({ unitId, complexId, caseId, documentType })),
    ]);
    return Response.json({ listingId, status: 'pending_verification', verificationCaseId: caseId, message: 'Объявление создано и отправлено на проверку документов.' }, { status: 201 });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'secondary_listing_failed', message: 'Не удалось создать объявление.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireVerifiedPhone(request);
    const body = await request.json() as Record<string, unknown>;
    const listingId = typeof body.listingId === 'string' ? body.listingId : '';
    const action = body.action === 'purchase' || body.action === 'renew' || body.action === 'price' || body.action === 'sold' || body.action === 'resubmit' ? body.action : null;
    if (!listingId || !action) return Response.json({ error: 'validation_failed', message: 'Не выбрано действие с объявлением.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const listing = await database.prepare(`SELECT listing.id, listing.status, listing.price_uzs, owner.verification_status, owner.document_type, unit.id AS unit_id
      FROM secondary_listing_owners owner JOIN listings listing ON listing.id = owner.listing_id JOIN units unit ON unit.id = listing.unit_id
      WHERE owner.seller_user_id = ? AND listing.id = ? LIMIT 1`).bind(session.user.id, listingId).first<{ id: string; status: string; price_uzs: number; verification_status: string; document_type: string; unit_id: string }>();
    if (!listing) return Response.json({ error: 'not_found', message: 'Объявление не найдено.' }, { status: 404 });
    if (action === 'price') {
      const priceUzs = integer(body.priceUzs);
      if (!priceUzs || priceUzs < 1_000_000 || ['sold', 'rejected'].includes(listing.status)) return Response.json({ error: 'validation_failed', message: 'Новая цена недоступна для этого объявления.' }, { status: 400 });
      await database.batch([
        database.prepare(`UPDATE listings SET price_uzs = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(priceUzs, listingId),
        database.prepare(`INSERT INTO listing_price_history (id, listing_id, old_price_uzs, new_price_uzs, reason, changed_by) VALUES (?, ?, ?, ?, 'seller_update', ?)`).bind(crypto.randomUUID(), listingId, listing.price_uzs, priceUzs, session.user.id),
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'secondary_listing.price_changed', 'listing', ?, ?)`).bind(crypto.randomUUID(), session.user.id, listingId, JSON.stringify({ before: listing.price_uzs, after: priceUzs })),
      ]);
      return Response.json({ listingId, priceUzs, message: 'Цена обновлена и добавлена в историю.' });
    }
    if (action === 'sold') {
      if (!['published', 'expired'].includes(listing.status)) return Response.json({ error: 'sold_unavailable', message: 'Отметить продажу можно только у опубликованного или завершённого объявления.' }, { status: 409 });
      await database.batch([
        database.prepare(`UPDATE listings SET status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('published', 'expired')`).bind(listingId),
        database.prepare(`UPDATE units SET availability_status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(listing.unit_id),
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'secondary_listing.sold', 'listing', ?, '{}')`).bind(crypto.randomUUID(), session.user.id, listingId),
      ]);
      return Response.json({ listingId, status: 'sold', message: 'Объявление отмечено как проданное.' });
    }
    if (action === 'resubmit') {
      const reference = typeof body.documentReference === 'string' ? body.documentReference.trim().slice(0, 120) : '';
      if (listing.verification_status === 'approved' && listing.status === 'rejected') {
        const payment = await database.prepare(`SELECT id FROM secondary_listing_purchases WHERE listing_id = ? AND status = 'active' AND period_end > CURRENT_TIMESTAMP LIMIT 1`).bind(listingId).first();
        if (!payment) return Response.json({ error: 'payment_required', message: 'Срок оплаты закончился. Сначала продлите публикацию.' }, { status: 409 });
        await database.batch([
          database.prepare(`UPDATE listings SET status = 'pending_moderation', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(listingId),
          database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'secondary_listing.moderation_resubmitted', 'listing', ?, '{}')`).bind(crypto.randomUUID(), session.user.id, listingId),
        ]);
        return Response.json({ listingId, status: 'pending_moderation', message: 'Объявление повторно отправлено на модерацию.' });
      }
      if (listing.verification_status !== 'rejected' || reference.length < 5) return Response.json({ error: 'resubmit_unavailable', message: 'Укажите исправленные реквизиты документа.' }, { status: 409 });
      const caseId = crypto.randomUUID();
      await database.batch([
        database.prepare(`UPDATE secondary_listing_owners SET document_reference = ?, verification_status = 'submitted', rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE listing_id = ?`).bind(reference, listingId),
        database.prepare(`UPDATE listings SET status = 'pending_verification', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(listingId),
        database.prepare(`INSERT INTO verification_cases (id, subject_type, subject_id, status, risk_level) VALUES (?, 'listing', ?, 'submitted', 'medium')`).bind(caseId, listingId),
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'secondary_listing.resubmitted', 'listing', ?, ?)`).bind(crypto.randomUUID(), session.user.id, listingId, JSON.stringify({ caseId })),
      ]);
      return Response.json({ listingId, status: 'pending_verification', message: 'Документы отправлены на повторную проверку.' });
    }
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
    if (listing.status === 'sold') return Response.json({ error: 'listing_sold', message: 'Проданное объявление нельзя оплатить или продлить.' }, { status: 409 });
    if (!validKey(idempotencyKey)) return Response.json({ error: 'idempotency_required', message: 'Обновите страницу и повторите оплату.' }, { status: 400 });
    const duplicate = await database.prepare(`SELECT id FROM secondary_listing_purchases WHERE idempotency_key = ? AND purchaser_user_id = ? LIMIT 1`).bind(idempotencyKey, session.user.id).first<{ id: string }>();
    if (duplicate) return Response.json({ listingId, duplicate: true, message: 'Этот период публикации уже оплачен.' });
    const config = await database.prepare(`SELECT secondary_listing_fee_uzs, secondary_period_days FROM platform_billing_config WHERE id = 'default' LIMIT 1`).first<{ secondary_listing_fee_uzs: number; secondary_period_days: number }>();
    const amount = Number(config?.secondary_listing_fee_uzs ?? 250_000), days = Number(config?.secondary_period_days ?? 30);
    const latest = await database.prepare(`SELECT period_end FROM secondary_listing_purchases WHERE listing_id = ? AND status = 'active' ORDER BY period_end DESC LIMIT 1`).bind(listingId).first<{ period_end: string }>();
    const now = databaseNow(), periodStart = latest && latest.period_end > now ? latest.period_end : now, periodEnd = addDays(periodStart, days);
    const billingId = crypto.randomUUID(), purchaseId = crypto.randomUUID();
    const payment = await paymentProvider().chargeBilling({ billingId, amountUzs: amount, idempotencyKey, productType: 'secondary_listing' });
    const nextStatus = listing.verification_status === 'approved' ? listing.status === 'expired' ? 'published' : listing.status === 'pending_verification' || listing.status === 'rejected' ? 'pending_moderation' : listing.status : listing.status;
    await database.batch([
      database.prepare(`INSERT INTO billing_events (id, listing_id, actor_user_id, event_type, amount_uzs, status, provider, provider_reference, idempotency_key, period_start, period_end, metadata_json) VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?, ?)`).bind(billingId, listingId, session.user.id, action === 'renew' ? 'secondary_renewal' : 'secondary_purchase', amount, payment.provider, payment.reference, idempotencyKey, periodStart, periodEnd, JSON.stringify({ days })),
      database.prepare(`INSERT INTO secondary_listing_purchases (id, listing_id, purchaser_user_id, billing_event_id, period_start, period_end, price_uzs, status, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`).bind(purchaseId, listingId, session.user.id, billingId, periodStart, periodEnd, amount, idempotencyKey),
      database.prepare(`UPDATE listings SET status = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(nextStatus, periodEnd, listingId),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, ?, 'listing', ?, ?)`).bind(crypto.randomUUID(), session.user.id, action === 'renew' ? 'secondary_listing.renewed' : 'secondary_listing.paid', listingId, JSON.stringify({ purchaseId, amount, periodStart, periodEnd })),
    ]);
    return Response.json({ listingId, status: nextStatus, paidUntil: periodEnd, message: action === 'renew' ? 'Публикация продлена ещё на 30 дней.' : 'Период публикации оплачен. Публикация произойдёт только после проверки и модерации.' });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'secondary_listing_update_failed', message: 'Не удалось обновить объявление.' }, { status: 500 });
  }
}
