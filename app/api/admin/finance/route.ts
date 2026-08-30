import { authorizationResponse, requirePermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { paymentProvider } from '@/lib/payment-provider';

export const dynamic = 'force-dynamic';

type FinanceOperation = {
  id: string;
  reservation_id: string;
  operation_type: 'reservation_payment' | 'refund' | 'reconciliation';
  provider: string;
  provider_reference: string;
  amount_uzs: number;
  status: 'pending' | 'succeeded' | 'failed' | 'manual_review';
  created_at: string;
  reservation_status: string;
  payment_status: string;
  buyer_name: string;
  complex_name: string;
  unit_number: string;
};

async function loadFinance(database: D1Database) {
  const result = await database.prepare(`SELECT operation.id, operation.reservation_id, operation.operation_type,
    operation.provider, operation.provider_reference, operation.amount_uzs, operation.status, operation.created_at,
    reservation.status AS reservation_status, reservation.payment_status,
    customer.full_name AS buyer_name, complex.name AS complex_name, unit.unit_number
    FROM payment_operations operation
    JOIN reservation_transactions reservation ON reservation.id = operation.reservation_id
    JOIN crm_customers customer ON customer.id = reservation.customer_id
    JOIN complexes complex ON complex.id = reservation.complex_id
    JOIN units unit ON unit.id = reservation.unit_id
    ORDER BY operation.created_at DESC LIMIT 100`).all<FinanceOperation>();
  const operations = result.results ?? [];
  return {
    operations,
    stats: {
      totalPaid: operations.filter((item) => item.operation_type === 'reservation_payment' && item.status === 'succeeded').reduce((total, item) => total + item.amount_uzs, 0),
      totalRefunded: operations.filter((item) => item.operation_type === 'refund' && item.status === 'succeeded').reduce((total, item) => total + item.amount_uzs, 0),
      reviewCount: operations.filter((item) => item.status !== 'succeeded').length,
      operationsCount: operations.length,
    },
  };
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, 'VIEW_ADMIN');
    const database = await ensureMarketplaceDatabase();
    return Response.json(await loadFinance(database), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to load finance operations', error);
    return Response.json({ error: 'finance_unavailable', message: 'Не удалось загрузить финансовые операции.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission(request, 'MANAGE_FINANCE');
    const payload = await request.json() as { operationId?: unknown };
    const operationId = typeof payload.operationId === 'string' ? payload.operationId : '';
    if (!operationId) return Response.json({ error: 'validation_failed', message: 'Операция не выбрана.' }, { status: 400 });

    const database = await ensureMarketplaceDatabase();
    const operation = await database.prepare(`SELECT operation.id, operation.operation_type, operation.provider_reference, operation.status,
      reservation.status AS reservation_status, reservation.payment_status
      FROM payment_operations operation JOIN reservation_transactions reservation ON reservation.id = operation.reservation_id
      WHERE operation.id = ? LIMIT 1`).bind(operationId).first<Pick<FinanceOperation, 'id' | 'operation_type' | 'provider_reference' | 'status' | 'reservation_status' | 'payment_status'>>();
    if (!operation) return Response.json({ error: 'not_found', message: 'Финансовая операция не найдена.' }, { status: 404 });
    if (operation.status === 'succeeded') return Response.json({ operationId, status: 'succeeded', duplicate: true });
    const stateMatches = operation.operation_type === 'reservation_payment'
      ? operation.reservation_status === 'confirmed' && operation.payment_status === 'paid'
      : operation.operation_type === 'refund' && operation.reservation_status === 'refunded' && operation.payment_status === 'refunded';
    if (!stateMatches) return Response.json({ error: 'state_mismatch', message: 'Состояние провайдера и брони расходится. Нужна ручная проверка.' }, { status: 409 });

    const reconciliation = await paymentProvider().reconcile({ operationId, providerReference: operation.provider_reference });
    await database.batch([
      database.prepare(`UPDATE payment_operations SET status = ?, provider = ?, provider_reference = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(reconciliation.status, reconciliation.provider, reconciliation.reference, operationId),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'user', ?, 'payment.reconciled', 'payment_operation', ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, operationId, JSON.stringify({ provider: reconciliation.provider, providerReference: reconciliation.reference })),
    ]);
    return Response.json({ operationId, status: reconciliation.status, message: 'Операция сверена с платёжным провайдером.' });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to reconcile finance operation', error);
    return Response.json({ error: 'reconciliation_failed', message: 'Не удалось выполнить сверку.' }, { status: 500 });
  }
}
