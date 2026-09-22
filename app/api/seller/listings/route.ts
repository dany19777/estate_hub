import { env } from 'cloudflare:workers';

import { authorizationResponse, requireVerifiedPhone } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

type SecondaryPaymentEnv = Cloudflare.Env & {
  PLATFORM_PAYMENT_BANK_ACCOUNT?: string;
  PLATFORM_PAYMENT_BANK_NAME?: string;
  SECONDARY_PAYMENT_BANK_ACCOUNT?: string;
  SECONDARY_PAYMENT_BANK_NAME?: string;
  SECONDARY_PAYMENT_CARD_NUMBER?: string;
  SECONDARY_PAYMENT_CARD_HOLDER?: string;
};

const paymentEnv = env as SecondaryPaymentEnv;

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
      (SELECT event.status FROM billing_events event WHERE event.listing_id = listing.id AND event.event_type IN ('secondary_purchase', 'secondary_renewal') ORDER BY event.created_at DESC LIMIT 1) AS payment_claim_status,
      (SELECT json_extract(event.metadata_json, '$.rejectionReason') FROM billing_events event WHERE event.listing_id = listing.id AND event.event_type IN ('secondary_purchase', 'secondary_renewal') ORDER BY event.created_at DESC LIMIT 1) AS payment_claim_reason,
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
  return { listings: listingResult.results ?? [], complexes: complexResult.results ?? [], billing: { feeUzs: Number(config?.secondary_listing_fee_uzs ?? 250_000), periodDays: Number(config?.secondary_period_days ?? 30), bankAccount: paymentEnv.PLATFORM_PAYMENT_BANK_ACCOUNT ?? paymentEnv.SECONDARY_PAYMENT_BANK_ACCOUNT ?? '', bankName: paymentEnv.PLATFORM_PAYMENT_BANK_NAME ?? paymentEnv.SECONDARY_PAYMENT_BANK_NAME ?? '', cardNumber: paymentEnv.SECONDARY_PAYMENT_CARD_NUMBER ?? '', cardHolder: paymentEnv.SECONDARY_PAYMENT_CARD_HOLDER ?? '' } };
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
    const action = body.action === 'submit_payment' || body.action === 'price' || body.action === 'sold' || body.action === 'resubmit' ? body.action : null;
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
    if (action !== 'submit_payment') return Response.json({ error: 'online_payments_disabled', message: 'Оплата на сайте отключена. Используйте перевод по реквизитам после одобрения.' }, { status: 409 });
    if (listing.verification_status !== 'approved' || listing.status === 'sold') return Response.json({ error: 'approval_required', message: 'Сначала требуется одобрение объявления.' }, { status: 409 });
    const method = body.method === 'bank' ? 'offline_bank_transfer' : body.method === 'card' ? 'offline_card_transfer' : '';
    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    const configured = method === 'offline_bank_transfer' ? paymentEnv.PLATFORM_PAYMENT_BANK_ACCOUNT ?? paymentEnv.SECONDARY_PAYMENT_BANK_ACCOUNT : paymentEnv.SECONDARY_PAYMENT_CARD_NUMBER;
    if (!method || !configured || reference.length < 6 || reference.length > 100 || !/^[\p{L}\p{N} ._\/-]+$/u.test(reference)) return Response.json({ error: 'validation_failed', message: 'Выберите доступный способ оплаты и укажите номер банковской операции.' }, { status: 400 });
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
    if (!validKey(idempotencyKey)) return Response.json({ error: 'idempotency_required', message: 'Повторите отправку.' }, { status: 400 });
    const existing = await database.prepare(`SELECT id FROM billing_events WHERE idempotency_key = ? LIMIT 1`).bind(idempotencyKey).first();
    if (existing) return Response.json({ listingId, duplicate: true, message: 'Заявка уже получена.' });
    const pending = await database.prepare(`SELECT id FROM billing_events WHERE listing_id = ? AND event_type IN ('secondary_purchase', 'secondary_renewal') AND status = 'pending' LIMIT 1`).bind(listingId).first();
    if (pending) return Response.json({ error: 'claim_pending', message: 'Подтверждение предыдущего перевода ещё проверяется.' }, { status: 409 });
    const config = await database.prepare(`SELECT secondary_listing_fee_uzs, secondary_period_days FROM platform_billing_config WHERE id = 'default' LIMIT 1`).first<{ secondary_listing_fee_uzs: number; secondary_period_days: number }>();
    if (!config || config.secondary_listing_fee_uzs <= 0) return Response.json({ error: 'config_missing', message: 'Тариф публикации ещё не настроен.' }, { status: 409 });
    const duplicateReference = await database.prepare(`SELECT id FROM billing_events WHERE provider = ? AND provider_reference = ? LIMIT 1`).bind(method, reference).first();
    if (duplicateReference) return Response.json({ error: 'duplicate_reference', message: 'Этот номер перевода уже использован.' }, { status: 409 });
    await database.batch([
      database.prepare(`INSERT INTO billing_events (id, listing_id, actor_user_id, event_type, amount_uzs, status, provider, provider_reference, idempotency_key, period_start, period_end, metadata_json) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '{}')`).bind(crypto.randomUUID(), listingId, session.user.id, listing.status === 'published' ? 'secondary_renewal' : 'secondary_purchase', config.secondary_listing_fee_uzs, method, reference, idempotencyKey),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'secondary_listing.payment_claimed', 'listing', ?, ?)`).bind(crypto.randomUUID(), session.user.id, listingId, JSON.stringify({ method, reference })),
    ]);
    return Response.json({ listingId, message: 'Номер перевода отправлен. Суперадмин проверит поступление средств; до подтверждения объявление скрыто.' });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'secondary_listing_update_failed', message: 'Не удалось обновить объявление.' }, { status: 500 });
  }
}
