import { authorizationResponse, requirePlatformPermission } from '@/lib/auth';
import { csvRows } from '@/lib/csv';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

type ExportRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  payment_status: string;
  cancellation_reason: string | null;
  buyer_name: string;
  complex_name: string;
  unit_number: string;
  reservation_fee_uzs: number;
  dispute_status: string | null;
  dispute_category: string | null;
  resolution_note: string | null;
  paid_uzs: number;
  refunded_uzs: number;
};

function validDate(value: string | null) {
  if (value === null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
  try {
    const session = await requirePlatformPermission(request, 'MANAGE_FINANCE');
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (!validDate(from) || !validDate(to) || (from && to && from > to)) {
      return Response.json({ error: 'invalid_period', message: 'Укажите корректный период в формате YYYY-MM-DD.' }, { status: 400 });
    }
    const database = await ensureMarketplaceDatabase();
    const filters = [from ? 'reservation.created_at >= ?' : '', to ? "reservation.created_at < datetime(?, '+1 day')" : ''].filter(Boolean);
    const bindings = [from, to].filter((value): value is string => value !== null);
    const result = await database.prepare(`SELECT reservation.id, reservation.created_at, reservation.updated_at,
      reservation.status, reservation.payment_status, reservation.cancellation_reason,
      customer.full_name AS buyer_name, complex.name AS complex_name, unit.unit_number,
      reservation.reservation_fee_uzs,
      (SELECT dispute.status FROM reservation_disputes dispute WHERE dispute.reservation_id = reservation.id ORDER BY dispute.created_at DESC LIMIT 1) AS dispute_status,
      (SELECT dispute.category FROM reservation_disputes dispute WHERE dispute.reservation_id = reservation.id ORDER BY dispute.created_at DESC LIMIT 1) AS dispute_category,
      (SELECT dispute.resolution_note FROM reservation_disputes dispute WHERE dispute.reservation_id = reservation.id ORDER BY dispute.created_at DESC LIMIT 1) AS resolution_note,
      COALESCE((SELECT SUM(operation.amount_uzs) FROM payment_operations operation WHERE operation.reservation_id = reservation.id AND operation.operation_type = 'reservation_payment' AND operation.status = 'succeeded'), 0) AS paid_uzs,
      COALESCE((SELECT SUM(operation.amount_uzs) FROM payment_operations operation WHERE operation.reservation_id = reservation.id AND operation.operation_type = 'refund' AND operation.status = 'succeeded'), 0) AS refunded_uzs
      FROM reservation_transactions reservation
      JOIN crm_customers customer ON customer.id = reservation.customer_id
      JOIN complexes complex ON complex.id = reservation.complex_id
      JOIN units unit ON unit.id = reservation.unit_id
      WHERE (reservation.status IN ('cancelled', 'expired', 'refunded') OR EXISTS
        (SELECT 1 FROM reservation_disputes dispute WHERE dispute.reservation_id = reservation.id))
      ${filters.length ? `AND ${filters.join(' AND ')}` : ''}
      ORDER BY reservation.created_at DESC, reservation.id DESC LIMIT 5001`).bind(...bindings).all<ExportRow>();
    const records = result.results ?? [];
    if (records.length > 5000) return Response.json({ error: 'too_many_records', message: 'Укажите более короткий период через параметры from и to.' }, { status: 422 });
    const csv = csvRows([
      ['Создана UTC', 'Обновлена UTC', 'ID брони', 'Статус брони', 'Статус оплаты', 'Причина отмены', 'Покупатель', 'ЖК', 'Квартира', 'Тариф брони UZS', 'Оплачено по операциям UZS', 'Возвращено по операциям UZS', 'Статус спора', 'Категория спора', 'Решение'],
      ...records.map((row) => [row.created_at, row.updated_at, row.id, row.status, row.payment_status, row.cancellation_reason, row.buyer_name, row.complex_name, row.unit_number, row.reservation_fee_uzs, row.paid_uzs, row.refunded_uzs, row.dispute_status, row.dispute_category, row.resolution_note]),
    ]);
    await database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
      VALUES (?, 'user', ?, 'finance.exported', 'finance', 'cancellations', ?)`).bind(crypto.randomUUID(), session.user.id, JSON.stringify({ from, to, count: records.length })).run();
    return new Response(csv, { headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="estatehub-cancellations-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'finance_export_failed', message: 'Не удалось сформировать выгрузку отмен и возвратов.' }, { status: 500 });
  }
}
