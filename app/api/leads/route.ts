import { authorizationResponse, requireVerifiedPhone } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

const allowedTimes = new Set(['10:00', '12:00', '14:00', '16:00', '18:00']);

function normalizeUzbekPhone(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 9) digits = `998${digits}`;
  return digits.length === 12 && digits.startsWith('998') ? `+${digits}` : null;
}

function validViewingDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const requested = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(requested.getTime())) return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const lastAvailable = new Date(today);
  lastAvailable.setUTCDate(lastAvailable.getUTCDate() + 30);
  return requested >= today && requested <= lastAvailable;
}

export async function POST(request: Request) {
  try {
    const session = await requireVerifiedPhone(request);
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
      return Response.json({ error: 'idempotency_required', message: 'Не удалось безопасно отправить заявку. Обновите страницу и повторите.' }, { status: 400 });
    }
    const database = await ensureMarketplaceDatabase();
    const existing = await database.prepare(`SELECT lead.id, lead.lead_type, lead.status, lead.repeated_interaction
      FROM leads lead JOIN crm_customers customer ON customer.id = lead.customer_id
      WHERE lead.idempotency_key = ? AND customer.buyer_user_id = ? LIMIT 1`).bind(idempotencyKey, session.user.id).first<{ id: string; lead_type: string; status: string; repeated_interaction: number }>();
    if (existing) return Response.json({ leadId: existing.id, type: existing.lead_type, status: existing.status, repeated: Boolean(existing.repeated_interaction), duplicate: true, message: 'Заявка уже была принята.' });

    const body = await request.json() as Record<string, unknown>;
    const type = body.type === 'consultation' || body.type === 'viewing' ? body.type : null;
    const complexId = typeof body.complexId === 'string' ? body.complexId : '';
    const listingId = typeof body.listingId === 'string' && body.listingId ? body.listingId : null;
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const phone = normalizeUzbekPhone(typeof body.phone === 'string' ? body.phone : '');
    const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : session.user.email;
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : '';
    const requestedDate = typeof body.requestedDate === 'string' ? body.requestedDate : '';
    const timeSlot = typeof body.timeSlot === 'string' ? body.timeSlot : '';
    if (!type || !complexId || fullName.length < 2 || fullName.length > 100 || !phone || email.length > 200) {
      return Response.json({ error: 'validation_failed', message: 'Проверьте имя и номер телефона в формате +998.' }, { status: 400 });
    }
    if (type === 'viewing' && (!listingId || !validViewingDate(requestedDate) || !allowedTimes.has(timeSlot))) {
      return Response.json({ error: 'viewing_validation_failed', message: 'Выберите доступную дату и время просмотра.' }, { status: 400 });
    }

    const complex = await database.prepare(`SELECT complex.id, complex.developer_org_id
      FROM complexes complex
      JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id AND workflow.status = 'published'
      JOIN organizations organization ON organization.id = complex.developer_org_id AND organization.verification_status = 'verified'
      WHERE complex.id = ? LIMIT 1`).bind(complexId).first<{ id: string; developer_org_id: string }>();
    if (!complex) return Response.json({ error: 'complex_unavailable', message: 'Этот ЖК пока не принимает заявки.' }, { status: 409 });
    if (listingId) {
      const listing = await database.prepare(`SELECT listing.id, listing.market_type
        FROM listings listing JOIN units unit ON unit.id = listing.unit_id
        WHERE listing.id = ? AND listing.complex_id = ? AND listing.status = 'published' AND unit.availability_status = 'available' LIMIT 1`)
        .bind(listingId, complexId).first<{ id: string; market_type: string }>();
      if (!listing) return Response.json({ error: 'listing_unavailable', message: 'Квартира больше не доступна. Обновите страницу.' }, { status: 409 });
      if (type === 'viewing' && listing.market_type !== 'PRIMARY_DEVELOPER') return Response.json({ error: 'viewing_not_supported', message: 'Для вторичного рынка используйте связь с продавцом.' }, { status: 409 });
    }

    let customer = await database.prepare(`SELECT id FROM crm_customers WHERE organization_id = ? AND phone_e164 = ? LIMIT 1`)
      .bind(complex.developer_org_id, phone).first<{ id: string }>();
    if (!customer) {
      const customerId = crypto.randomUUID();
      await database.prepare(`INSERT OR IGNORE INTO crm_customers (id, organization_id, buyer_user_id, full_name, phone_e164, email, first_source) VALUES (?, ?, ?, ?, ?, ?, 'estatehub')`)
        .bind(customerId, complex.developer_org_id, session.user.id, fullName, phone, email).run();
      customer = await database.prepare(`SELECT id FROM crm_customers WHERE organization_id = ? AND phone_e164 = ? LIMIT 1`).bind(complex.developer_org_id, phone).first<{ id: string }>();
    } else {
      await database.prepare(`UPDATE crm_customers SET buyer_user_id = COALESCE(buyer_user_id, ?), full_name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(session.user.id, fullName, email, customer.id).run();
    }
    if (!customer) throw new Error('Customer could not be created');
    const previousInteractions = await database.prepare(`SELECT COUNT(*) AS count FROM leads WHERE customer_id = ?`).bind(customer.id).first<{ count: number }>();
    const repeated = (previousInteractions?.count ?? 0) > 0;
    const leadId = crypto.randomUUID();
    const statements = [
      database.prepare(`INSERT INTO leads (id, customer_id, organization_id, complex_id, listing_id, lead_type, status, source, message, repeated_interaction, idempotency_key)
        VALUES (?, ?, ?, ?, ?, ?, 'new', 'estatehub_complex_detail', ?, ?, ?)`)
        .bind(leadId, customer.id, complex.developer_org_id, complexId, listingId, type, message, repeated ? 1 : 0, idempotencyKey),
      database.prepare(`INSERT INTO lead_activities (id, lead_id, actor_type, actor_id, activity_type, metadata_json) VALUES (?, ?, 'buyer', ?, 'lead.created', ?)`)
        .bind(crypto.randomUUID(), leadId, session.user.id, JSON.stringify({ type, source: 'estatehub_complex_detail', repeated })),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'lead.submitted', 'lead', ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, leadId, JSON.stringify({ complexId, listingId, type })),
    ];
    if (type === 'viewing') {
      statements.push(database.prepare(`INSERT INTO viewings (id, lead_id, requested_date, time_slot, status) VALUES (?, ?, ?, ?, 'requested')`)
        .bind(crypto.randomUUID(), leadId, requestedDate, timeSlot));
    }
    await database.batch(statements);
    return Response.json({ leadId, type, status: 'new', repeated, duplicate: false, message: type === 'viewing' ? 'Запрос на просмотр отправлен. Менеджер подтвердит время.' : 'Заявка на консультацию отправлена.' }, { status: 201 });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to submit lead', error);
    return Response.json({ error: 'lead_submission_failed', message: 'Не удалось отправить заявку. Попробуйте ещё раз.' }, { status: 500 });
  }
}
