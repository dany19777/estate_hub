import { authorizationResponse, requirePlatformPermission } from '@/lib/auth';
import { csvRows } from '@/lib/csv';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

type BillingExportRow = {
  id: string;
  event_type: string;
  status: string;
  amount_uzs: number;
  provider: string;
  provider_reference: string;
  organization_id: string | null;
  organization_name: string | null;
  listing_id: string | null;
  complex_name: string | null;
  unit_number: string | null;
  seller_name: string | null;
  contract_reference: string | null;
  confirmed_by: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
};

function validDate(value: string | null) {
  if (value === null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
  try {
    const session = await requirePlatformPermission(request, 'MANAGE_BILLING');
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (!validDate(from) || !validDate(to) || (from && to && from > to)) {
      return Response.json({ error: 'invalid_period', message: 'Укажите корректный период в формате YYYY-MM-DD.' }, { status: 400 });
    }
    const database = await ensureMarketplaceDatabase();
    const filters = [from ? 'event.created_at >= ?' : '', to ? "event.created_at < datetime(?, '+1 day')" : ''].filter(Boolean);
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const bindings = [from, to].filter((value): value is string => value !== null);
    const result = await database.prepare(`SELECT event.id, event.event_type, event.status, event.amount_uzs,
      event.provider, event.provider_reference, event.organization_id, organization.name AS organization_name,
      event.listing_id, complex.name AS complex_name, unit.unit_number,
      owner.full_name AS seller_name,
      CASE WHEN json_valid(event.metadata_json) THEN json_extract(event.metadata_json, '$.contractReference') END AS contract_reference,
      CASE WHEN json_valid(event.metadata_json) THEN json_extract(event.metadata_json, '$.confirmedBy') END AS confirmed_by,
      event.period_start, event.period_end, event.created_at
      FROM billing_events event
      LEFT JOIN organizations organization ON organization.id = event.organization_id
      LEFT JOIN listings listing ON listing.id = event.listing_id
      LEFT JOIN complexes complex ON complex.id = listing.complex_id
      LEFT JOIN units unit ON unit.id = listing.unit_id
      LEFT JOIN secondary_listing_owners seller ON seller.listing_id = event.listing_id
      LEFT JOIN users owner ON owner.id = seller.seller_user_id
      ${where} ORDER BY event.created_at DESC, event.id DESC LIMIT 5001`).bind(...bindings).all<BillingExportRow>();
    const records = result.results ?? [];
    if (records.length > 5000) {
      return Response.json({ error: 'too_many_events', message: 'В периоде больше 5000 записей. Укажите более короткий период через параметры from и to.' }, { status: 422 });
    }
    const csv = csvRows([
      ['Дата UTC', 'ID операции', 'Тип', 'Статус', 'Сумма UZS', 'Способ', 'Номер перевода', 'ID компании', 'Компания', 'ID объявления', 'ЖК', 'Квартира', 'Продавец', 'Номер договора', 'Подтвердил', 'Период с', 'Период до'],
      ...records.map((row) => [row.created_at, row.id, row.event_type, row.status, row.amount_uzs, row.provider, row.provider_reference, row.organization_id, row.organization_name, row.listing_id, row.complex_name, row.unit_number, row.seller_name, row.contract_reference, row.confirmed_by, row.period_start, row.period_end]),
    ]);
    await database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
      VALUES (?, 'user', ?, 'billing.exported', 'billing', 'events', ?)`).bind(crypto.randomUUID(), session.user.id, JSON.stringify({ from, to, count: records.length })).run();
    const filename = `estatehub-billing-${new Date().toISOString().slice(0, 10)}.csv`;
    return new Response(csv, { headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'billing_export_failed', message: 'Не удалось сформировать выгрузку.' }, { status: 500 });
  }
}
