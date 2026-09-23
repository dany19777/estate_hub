import { env } from 'cloudflare:workers';

import { authorizationResponse, requirePermission } from '@/lib/auth';
import { addDays, databaseNow, expireBillingPeriods } from '@/lib/billing';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { localSandboxEnabled } from '@/lib/local-sandbox';
import { paymentProvider } from '@/lib/payment-provider';
import { onlinePaymentsDisabledResponse, onlinePaymentsEnabled } from '@/lib/payment-mode';

export const dynamic = 'force-dynamic';

type SubscriptionRow = {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  auto_renew: number;
  code: string;
  name: string;
  inventory_limit: number;
  monthly_price_uzs: number;
};

async function developerBillingData(database: D1Database, organizationId: string, sandboxEnabled: boolean) {
  await expireBillingPeriods(database);
  const [plans, subscription, usage, events] = await Promise.all([
    database.prepare(`SELECT id, code, name, inventory_limit, monthly_price_uzs, is_active
      FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order ASC`).all(),
    database.prepare(`SELECT subscription.id, subscription.organization_id, subscription.plan_id,
      subscription.status, subscription.current_period_start, subscription.current_period_end, subscription.auto_renew,
      EXISTS (SELECT 1 FROM developer_subscription_activations activation JOIN billing_events event ON event.id = activation.billing_event_id
        WHERE activation.organization_id = subscription.organization_id AND event.status = 'paid'
          AND event.period_start <= CURRENT_TIMESTAMP AND event.period_end > CURRENT_TIMESTAMP
          AND (event.provider = 'offline_bank_transfer' OR (event.provider = 'sandbox_local' AND ${sandboxEnabled ? 1 : 0} = 1))) AS contract_paid,
      EXISTS (SELECT 1 FROM developer_subscription_activations activation JOIN billing_events event ON event.id = activation.billing_event_id
        WHERE activation.organization_id = subscription.organization_id AND event.status = 'paid' AND event.provider = 'sandbox_local'
          AND event.period_start <= CURRENT_TIMESTAMP AND event.period_end > CURRENT_TIMESTAMP AND ${sandboxEnabled ? 1 : 0} = 1) AS sandbox_active,
      plan.code, plan.name, plan.inventory_limit, plan.monthly_price_uzs
      FROM developer_subscriptions subscription
      JOIN subscription_plans plan ON plan.id = subscription.plan_id
      WHERE subscription.organization_id = ? LIMIT 1`).bind(organizationId).first<SubscriptionRow>(),
    database.prepare(`SELECT COUNT(*) AS active_inventory
      FROM listings WHERE seller_org_id = ? AND market_type = 'PRIMARY_DEVELOPER' AND status IN ('published', 'reserved')`)
      .bind(organizationId).first<{ active_inventory: number }>(),
    database.prepare(`SELECT id, event_type, amount_uzs, status, provider, provider_reference, metadata_json, period_start, period_end, created_at
      FROM billing_events WHERE organization_id = ? ORDER BY created_at DESC LIMIT 12`).bind(organizationId).all(),
  ]);
  return {
    plans: plans.results ?? [],
    subscription,
    usage: { activeInventory: Number(usage?.active_inventory ?? 0), limit: Number(subscription?.inventory_limit ?? 0) },
    events: events.results ?? [],
    paymentDetails: {
      bankName: (env as Cloudflare.Env & { PLATFORM_PAYMENT_BANK_NAME?: string }).PLATFORM_PAYMENT_BANK_NAME ?? '',
      bankAccount: (env as Cloudflare.Env & { PLATFORM_PAYMENT_BANK_ACCOUNT?: string }).PLATFORM_PAYMENT_BANK_ACCOUNT ?? '',
    },
  };
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(request, 'MANAGE_BILLING');
    if (!session.organization) return Response.json({ error: 'organization_required', message: 'Кабинет не связан с организацией.' }, { status: 403 });
    const bankAccount = (env as Cloudflare.Env & { PLATFORM_PAYMENT_BANK_ACCOUNT?: string }).PLATFORM_PAYMENT_BANK_ACCOUNT;
    if (!bankAccount) return Response.json({ error: 'payment_details_missing', message: 'Реквизиты компании ещё не настроены.' }, { status: 409 });
    const body = await request.json() as Record<string, unknown>;
    const planId = typeof body.planId === 'string' ? body.planId : '';
    const contractReference = typeof body.contractReference === 'string' ? body.contractReference.trim() : '';
    const transferReference = typeof body.transferReference === 'string' ? body.transferReference.trim() : '';
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
    const validReference = (value: string) => value.length >= 6 && value.length <= 100 && /^[\p{L}\p{N} ._/-]+$/u.test(value);
    if (!planId || !validReference(contractReference) || !validReference(transferReference) || !/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) return Response.json({ error: 'validation_failed', message: 'Укажите тариф, номер подписанного договора и номер банковского перевода.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const [plan, subscription, pending, duplicate, duplicateReference, usage] = await Promise.all([
      database.prepare(`SELECT id, monthly_price_uzs, inventory_limit FROM subscription_plans WHERE id = ? AND is_active = 1 LIMIT 1`).bind(planId).first<{ id: string; monthly_price_uzs: number; inventory_limit: number }>(),
      database.prepare(`SELECT id, plan_id, current_period_end FROM developer_subscriptions WHERE organization_id = ? LIMIT 1`).bind(session.organization.id).first<{ id: string; plan_id: string; current_period_end: string }>(),
      database.prepare(`SELECT id FROM billing_events WHERE organization_id = ? AND event_type IN ('subscription_charge', 'plan_change') AND status = 'pending' LIMIT 1`).bind(session.organization.id).first(),
      database.prepare(`SELECT id FROM billing_events WHERE idempotency_key = ? LIMIT 1`).bind(idempotencyKey).first(),
      database.prepare(`SELECT id FROM billing_events WHERE provider = 'offline_bank_transfer' AND provider_reference = ? LIMIT 1`).bind(transferReference).first(),
      database.prepare(`SELECT COUNT(*) AS count FROM listings WHERE seller_org_id = ? AND market_type = 'PRIMARY_DEVELOPER' AND status IN ('published', 'reserved')`).bind(session.organization.id).first<{ count: number }>(),
    ]);
    if (duplicate) return Response.json({ duplicate: true, message: 'Заявка уже получена.', ...(await developerBillingData(database, session.organization.id, localSandboxEnabled(request))) });
    if (!plan || !subscription || plan.monthly_price_uzs < 1) return Response.json({ error: 'plan_unavailable', message: 'Платный тариф не найден.' }, { status: 409 });
    if (Number(usage?.count ?? 0) > plan.inventory_limit) return Response.json({ error: 'inventory_limit', message: 'Для выбранного тарифа нужно сначала сократить число активных квартир.' }, { status: 409 });
    if (pending) return Response.json({ error: 'claim_pending', message: 'Предыдущая заявка на оплату ещё проверяется.' }, { status: 409 });
    if (duplicateReference) return Response.json({ error: 'duplicate_reference', message: 'Этот номер банковской операции уже использован.' }, { status: 409 });
    const eventId = crypto.randomUUID();
    await database.batch([
      database.prepare(`INSERT INTO billing_events (id, organization_id, actor_user_id, event_type, amount_uzs, status, provider, provider_reference, idempotency_key, period_start, period_end, metadata_json) VALUES (?, ?, ?, ?, ?, 'pending', 'offline_bank_transfer', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)`).bind(eventId, session.organization.id, session.user.id, planId === subscription.plan_id ? 'subscription_charge' : 'plan_change', plan.monthly_price_uzs, transferReference, idempotencyKey, JSON.stringify({ planId, contractReference })),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'billing.developer_claimed', 'organization', ?, ?)`).bind(crypto.randomUUID(), session.user.id, session.organization.id, JSON.stringify({ eventId, contractReference, transferReference, planId })),
    ]);
    return Response.json({ message: 'Номер договора и перевода отправлены на проверку. Доступ обновится после подтверждения суперадмином.', ...(await developerBillingData(database, session.organization.id, localSandboxEnabled(request))) });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to submit developer payment claim', error);
    return Response.json({ error: 'operation_failed', message: 'Не удалось отправить заявку на проверку.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await requirePermission(request, 'VIEW_DEVELOPER_DASHBOARD');
    if (!session.organization) return Response.json({ error: 'organization_required', message: 'Кабинет не связан с организацией.' }, { status: 403 });
    const database = await ensureMarketplaceDatabase();
    return Response.json(await developerBillingData(database, session.organization.id, localSandboxEnabled(request)), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to load developer billing', error);
    return Response.json({ error: 'operation_failed', message: 'Не удалось загрузить тариф и платежи.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!onlinePaymentsEnabled()) return onlinePaymentsDisabledResponse();
  try {
    const session = await requirePermission(request, 'MANAGE_BILLING');
    if (!session.organization) return Response.json({ error: 'organization_required', message: 'Кабинет не связан с организацией.' }, { status: 403 });
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
    if (!idempotencyKey) return Response.json({ error: 'idempotency_required', message: 'Повторите действие: отсутствует ключ операции.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const duplicate = await database.prepare(`SELECT id FROM billing_events WHERE idempotency_key = ? LIMIT 1`).bind(idempotencyKey).first<{ id: string }>();
    if (duplicate) return Response.json({ duplicate: true, message: 'Платёж уже обработан.', ...(await developerBillingData(database, session.organization.id, localSandboxEnabled(request))) });

    const body = await request.json() as Record<string, unknown>;
    const action = body.action === 'change_plan' || body.action === 'renew' ? body.action : null;
    if (!action) return Response.json({ error: 'validation_failed', message: 'Неизвестное действие с подпиской.' }, { status: 400 });
    const subscription = await database.prepare(`SELECT subscription.id, subscription.plan_id, subscription.status,
      subscription.current_period_end, plan.inventory_limit
      FROM developer_subscriptions subscription JOIN subscription_plans plan ON plan.id = subscription.plan_id
      WHERE subscription.organization_id = ? LIMIT 1`).bind(session.organization.id)
      .first<{ id: string; plan_id: string; status: string; current_period_end: string; inventory_limit: number }>();
    if (!subscription) return Response.json({ error: 'subscription_missing', message: 'Подписка организации не создана.' }, { status: 409 });

    const planId = action === 'renew' ? subscription.plan_id : typeof body.planId === 'string' ? body.planId : '';
    const plan = await database.prepare(`SELECT id, code, name, inventory_limit, monthly_price_uzs FROM subscription_plans WHERE id = ? AND is_active = 1 LIMIT 1`)
      .bind(planId).first<{ id: string; code: string; name: string; inventory_limit: number; monthly_price_uzs: number }>();
    if (!plan) return Response.json({ error: 'plan_not_found', message: 'Выбранный тариф недоступен.' }, { status: 404 });
    const usage = await database.prepare(`SELECT COUNT(*) AS count FROM listings
      WHERE seller_org_id = ? AND market_type = 'PRIMARY_DEVELOPER' AND status IN ('published', 'reserved')`)
      .bind(session.organization.id).first<{ count: number }>();
    if (Number(usage?.count ?? 0) > Number(plan.inventory_limit)) {
      return Response.json({ error: 'inventory_limit', message: `На тарифе ${plan.name} доступно ${plan.inventory_limit} активных объявлений. Сначала архивируйте лишние.` }, { status: 409 });
    }

    const now = databaseNow();
    const canExtend = action === 'renew' && new Date(`${subscription.current_period_end.replace(' ', 'T')}Z`) > new Date();
    const periodStart = canExtend ? subscription.current_period_end : now;
    const periodEnd = addDays(periodStart, 30);
    const eventId = crypto.randomUUID();
    const payment = await paymentProvider().chargeBilling({ billingId: eventId, amountUzs: Number(plan.monthly_price_uzs), idempotencyKey, productType: 'developer_subscription' });
    await database.batch([
      database.prepare(`UPDATE developer_subscriptions SET plan_id = ?, status = 'active', current_period_start = ?, current_period_end = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(plan.id, periodStart, periodEnd, subscription.id),
      database.prepare(`INSERT INTO billing_events
        (id, organization_id, actor_user_id, event_type, amount_uzs, status, provider, provider_reference, idempotency_key, period_start, period_end, metadata_json)
        VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?, ?)`)
        .bind(eventId, session.organization.id, session.user.id, action === 'renew' ? 'subscription_charge' : 'plan_change', Number(plan.monthly_price_uzs), payment.provider, payment.reference, idempotencyKey, periodStart, periodEnd, JSON.stringify({ planId: plan.id, planCode: plan.code })),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'user', ?, ?, 'developer_subscription', ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, action === 'renew' ? 'billing.subscription_renewed' : 'billing.plan_changed', subscription.id, JSON.stringify({ planId: plan.id, periodEnd, amountUzs: plan.monthly_price_uzs })),
    ]);
    return Response.json({ message: action === 'renew' ? 'Подписка продлена на 30 дней.' : `Тариф ${plan.name} подключён.`, ...(await developerBillingData(database, session.organization.id, localSandboxEnabled(request))) });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to update developer billing', error);
    return Response.json({ error: 'operation_failed', message: 'Не удалось обновить подписку.' }, { status: 500 });
  }
}
