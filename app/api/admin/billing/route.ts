import { authorizationResponse, requirePermission, requirePlatformPermission } from '@/lib/auth';
import { addDays, databaseNow, expireBillingPeriods } from '@/lib/billing';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { localSandboxEnabled } from '@/lib/local-sandbox';

export const dynamic = 'force-dynamic';

async function adminBillingData(database: D1Database, sandboxEnabled = false) {
  await expireBillingPeriods(database);
  const [plans, subscriptions, config, secondaryListings, events, totals] = await Promise.all([
    database.prepare(`SELECT id, code, name, inventory_limit, monthly_price_uzs, is_active, sort_order FROM subscription_plans ORDER BY sort_order ASC`).all(),
    database.prepare(`SELECT subscription.id, subscription.organization_id, organization.name AS organization_name,
      subscription.status, subscription.current_period_end, subscription.auto_renew,
      plan.id AS plan_id, plan.code, plan.name AS plan_name, plan.inventory_limit, plan.monthly_price_uzs,
      EXISTS (SELECT 1 FROM developer_subscription_activations activation JOIN billing_events demo ON demo.id = activation.billing_event_id
        WHERE activation.organization_id = subscription.organization_id AND demo.status = 'paid' AND demo.provider = 'sandbox_local'
          AND demo.period_start <= CURRENT_TIMESTAMP AND demo.period_end > CURRENT_TIMESTAMP AND ${sandboxEnabled ? 1 : 0} = 1) AS sandbox_active,
      (SELECT event.id FROM billing_events event WHERE event.organization_id = subscription.organization_id AND event.status = 'pending' AND event.event_type IN ('subscription_charge', 'plan_change') ORDER BY event.created_at DESC LIMIT 1) AS payment_claim_id,
      (SELECT event.provider_reference FROM billing_events event WHERE event.organization_id = subscription.organization_id AND event.status = 'pending' AND event.event_type IN ('subscription_charge', 'plan_change') ORDER BY event.created_at DESC LIMIT 1) AS payment_reference,
      (SELECT json_extract(event.metadata_json, '$.contractReference') FROM billing_events event WHERE event.organization_id = subscription.organization_id AND event.status = 'pending' AND event.event_type IN ('subscription_charge', 'plan_change') ORDER BY event.created_at DESC LIMIT 1) AS contract_reference,
      (SELECT event.amount_uzs FROM billing_events event WHERE event.organization_id = subscription.organization_id AND event.status = 'pending' AND event.event_type IN ('subscription_charge', 'plan_change') ORDER BY event.created_at DESC LIMIT 1) AS payment_amount,
      (SELECT requested.name FROM billing_events event JOIN subscription_plans requested ON requested.id = json_extract(event.metadata_json, '$.planId') WHERE event.organization_id = subscription.organization_id AND event.status = 'pending' AND event.event_type IN ('subscription_charge', 'plan_change') ORDER BY event.created_at DESC LIMIT 1) AS requested_plan_name,
      (SELECT COUNT(*) FROM listings listing WHERE listing.seller_org_id = subscription.organization_id
        AND listing.market_type = 'PRIMARY_DEVELOPER' AND listing.status IN ('published', 'reserved')) AS active_inventory
      FROM developer_subscriptions subscription
      JOIN organizations organization ON organization.id = subscription.organization_id
      JOIN subscription_plans plan ON plan.id = subscription.plan_id
      ORDER BY organization.name ASC`).all(),
    database.prepare(`SELECT id, secondary_listing_fee_uzs, secondary_period_days, updated_at FROM platform_billing_config WHERE id = 'default' LIMIT 1`).first(),
    database.prepare(`SELECT listing.id, listing.status, listing.market_type, listing.price_uzs, listing.expires_at,
      unit.unit_number, complex.name AS complex_name,
      COALESCE(organization.name, CASE WHEN listing.seller_type = 'owner' THEN 'Частный собственник' ELSE 'Продавец' END) AS seller_name,
      (SELECT purchase.status FROM secondary_listing_purchases purchase JOIN billing_events payment ON payment.id = purchase.billing_event_id WHERE payment.status = 'paid' AND payment.provider IN ('offline_bank_transfer', 'offline_card_transfer') AND purchase.listing_id = listing.id ORDER BY purchase.created_at DESC LIMIT 1) AS purchase_status,
      (SELECT purchase.period_end FROM secondary_listing_purchases purchase JOIN billing_events payment ON payment.id = purchase.billing_event_id WHERE payment.status = 'paid' AND payment.provider IN ('offline_bank_transfer', 'offline_card_transfer') AND purchase.listing_id = listing.id ORDER BY purchase.created_at DESC LIMIT 1) AS paid_until
      ,(SELECT event.id FROM billing_events event WHERE event.listing_id = listing.id AND event.status = 'pending' AND event.event_type IN ('secondary_purchase', 'secondary_renewal') ORDER BY event.created_at DESC LIMIT 1) AS payment_claim_id
      ,(SELECT event.provider FROM billing_events event WHERE event.listing_id = listing.id AND event.status = 'pending' AND event.event_type IN ('secondary_purchase', 'secondary_renewal') ORDER BY event.created_at DESC LIMIT 1) AS payment_method
      ,(SELECT event.provider_reference FROM billing_events event WHERE event.listing_id = listing.id AND event.status = 'pending' AND event.event_type IN ('secondary_purchase', 'secondary_renewal') ORDER BY event.created_at DESC LIMIT 1) AS payment_reference
      FROM listings listing JOIN units unit ON unit.id = listing.unit_id JOIN complexes complex ON complex.id = listing.complex_id
      LEFT JOIN organizations organization ON organization.id = listing.seller_org_id
      WHERE listing.market_type IN ('SECONDARY_OWNER', 'SECONDARY_AGENCY')
      ORDER BY CASE WHEN listing.expires_at IS NULL THEN 0 ELSE 1 END, listing.expires_at ASC, complex.name ASC`).all(),
    database.prepare(`SELECT event.id, event.event_type, event.amount_uzs, event.status, event.provider, event.period_start, event.period_end, event.created_at,
      organization.name AS organization_name, complex.name AS complex_name, unit.unit_number
      FROM billing_events event LEFT JOIN organizations organization ON organization.id = event.organization_id
      LEFT JOIN listings listing ON listing.id = event.listing_id LEFT JOIN complexes complex ON complex.id = listing.complex_id
      LEFT JOIN units unit ON unit.id = listing.unit_id ORDER BY event.created_at DESC LIMIT 20`).all(),
    database.prepare(`SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' AND provider IN ('offline_bank_transfer', 'offline_card_transfer') THEN amount_uzs ELSE 0 END), 0) AS revenue,
      (SELECT COUNT(*) FROM developer_subscriptions subscription WHERE subscription.status = 'active' AND subscription.current_period_end > CURRENT_TIMESTAMP
        AND EXISTS (SELECT 1 FROM developer_subscription_activations activation JOIN billing_events event ON event.id = activation.billing_event_id
          WHERE activation.organization_id = subscription.organization_id AND event.status = 'paid'
            AND (event.provider = 'offline_bank_transfer' OR (event.provider = 'sandbox_local' AND ${sandboxEnabled ? 1 : 0} = 1))
            AND event.period_start <= CURRENT_TIMESTAMP AND event.period_end > CURRENT_TIMESTAMP)) AS active_subscriptions,
      (SELECT COUNT(*) FROM secondary_listing_purchases purchase JOIN billing_events payment ON payment.id = purchase.billing_event_id WHERE payment.status = 'paid' AND payment.provider IN ('offline_bank_transfer', 'offline_card_transfer') AND purchase.status = 'active' AND purchase.period_end > CURRENT_TIMESTAMP) AS active_secondary,
      (SELECT COUNT(*) FROM secondary_listing_purchases purchase JOIN billing_events payment ON payment.id = purchase.billing_event_id WHERE payment.status = 'paid' AND payment.provider IN ('offline_bank_transfer', 'offline_card_transfer') AND purchase.status = 'active' AND purchase.period_end BETWEEN CURRENT_TIMESTAMP AND datetime('now', '+7 days')) AS expiring_secondary
      FROM billing_events`).first(),
  ]);
  return {
    plans: plans.results ?? [], subscriptions: subscriptions.results ?? [], config, sandboxMode: sandboxEnabled,
    secondaryListings: secondaryListings.results ?? [], events: events.results ?? [],
    stats: {
      revenue: Number((totals as { revenue?: number } | null)?.revenue ?? 0),
      activeSubscriptions: Number((totals as { active_subscriptions?: number } | null)?.active_subscriptions ?? 0),
      activeSecondary: Number((totals as { active_secondary?: number } | null)?.active_secondary ?? 0),
      expiringSecondary: Number((totals as { expiring_secondary?: number } | null)?.expiring_secondary ?? 0),
    },
  };
}

export async function GET(request: Request) {
  try {
    const session = await requirePermission(request, 'VIEW_ADMIN');
    const database = await ensureMarketplaceDatabase();
    return Response.json(await adminBillingData(database, localSandboxEnabled(request) && session.platformRoles.includes('SUPERADMIN')), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to load admin billing', error);
    return Response.json({ error: 'operation_failed', message: 'Не удалось загрузить биллинг платформы.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePlatformPermission(request, 'MANAGE_BILLING');
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : '';
    const database = await ensureMarketplaceDatabase();

    if (action === 'activate_demo_developer') {
      if (!localSandboxEnabled(request) || !session.platformRoles.includes('SUPERADMIN')) {
        return Response.json({ error: 'forbidden', message: 'Тестовая активация доступна только суперадмину на localhost.' }, { status: 403 });
      }
      const organizationId = typeof body.organizationId === 'string' ? body.organizationId : '';
      const planId = typeof body.planId === 'string' ? body.planId : '';
      const [subscription, plan, usage, pending] = await Promise.all([
        database.prepare(`SELECT id, plan_id, status, current_period_end FROM developer_subscriptions WHERE organization_id = ? LIMIT 1`).bind(organizationId).first<{ id: string; plan_id: string; status: string; current_period_end: string }>(),
        database.prepare(`SELECT id, inventory_limit FROM subscription_plans WHERE id = ? AND is_active = 1 AND monthly_price_uzs > 0 LIMIT 1`).bind(planId).first<{ id: string; inventory_limit: number }>(),
        database.prepare(`SELECT COUNT(*) AS count FROM listings WHERE seller_org_id = ? AND market_type = 'PRIMARY_DEVELOPER' AND status IN ('published', 'reserved')`).bind(organizationId).first<{ count: number }>(),
        database.prepare(`SELECT id FROM billing_events WHERE organization_id = ? AND status = 'pending' AND event_type IN ('subscription_charge', 'plan_change') LIMIT 1`).bind(organizationId).first(),
      ]);
      if (!subscription || !plan) return Response.json({ error: 'not_found', message: 'Подписка или тариф не найдены.' }, { status: 404 });
      if (pending) return Response.json({ error: 'claim_pending', message: 'Сначала обработайте ожидающую заявку на реальный перевод.' }, { status: 409 });
      if (Number(usage?.count ?? 0) > plan.inventory_limit) return Response.json({ error: 'inventory_limit', message: 'Для этого тарифа слишком много активных квартир.' }, { status: 409 });
      const now = databaseNow();
      const start = subscription.status === 'active' && subscription.current_period_end > now ? subscription.current_period_end : now;
      const end = addDays(start, 30);
      const eventId = crypto.randomUUID();
      await database.batch([
        database.prepare(`INSERT INTO billing_events (id, organization_id, actor_user_id, event_type, amount_uzs, status, provider, provider_reference, idempotency_key, period_start, period_end, metadata_json)
          VALUES (?, ?, ?, ?, 0, 'paid', 'sandbox_local', ?, ?, ?, ?, ?)`)
          .bind(eventId, organizationId, session.user.id, planId === subscription.plan_id ? 'subscription_charge' : 'plan_change', `LOCAL-DEMO-${eventId}`, eventId, start, end, JSON.stringify({ planId, demo: true })),
        database.prepare(`INSERT INTO developer_subscription_activations (billing_event_id, organization_id, confirmed_by) VALUES (?, ?, ?)`).bind(eventId, organizationId, session.user.id),
        database.prepare(`UPDATE developer_subscriptions SET plan_id = ?, status = 'active', current_period_start = ?, current_period_end = ?, auto_renew = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(planId, start, end, subscription.id),
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'billing.developer_demo_activated', 'organization', ?, ?)`).bind(crypto.randomUUID(), session.user.id, organizationId, JSON.stringify({ planId, end, eventId })),
      ]);
      return Response.json({ message: 'Тестовая подписка активирована на 30 дней без платежа.', ...(await adminBillingData(database, true)) });
    }

    if (action === 'update_plan') {
      const planId = typeof body.planId === 'string' ? body.planId : '';
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const inventoryLimit = Number(body.inventoryLimit);
      const monthlyPriceUzs = Number(body.monthlyPriceUzs);
      const isActive = body.isActive === false ? 0 : 1;
      if (!planId || !name || !Number.isInteger(inventoryLimit) || inventoryLimit < 1 || !Number.isInteger(monthlyPriceUzs) || monthlyPriceUzs < 0) {
        return Response.json({ error: 'validation_failed', message: 'Проверьте название, лимит и стоимость тарифа.' }, { status: 400 });
      }
      const result = await database.prepare(`UPDATE subscription_plans SET name = ?, inventory_limit = ?, monthly_price_uzs = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(name, inventoryLimit, monthlyPriceUzs, isActive, planId).run();
      if (!result.meta.changes) return Response.json({ error: 'not_found', message: 'Тариф не найден.' }, { status: 404 });
      await database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'user', ?, 'billing.plan_updated', 'subscription_plan', ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, planId, JSON.stringify({ name, inventoryLimit, monthlyPriceUzs, isActive: Boolean(isActive) })).run();
      return Response.json({ message: 'Параметры тарифа сохранены.', ...(await adminBillingData(database, localSandboxEnabled(request))) });
    }

    if (action === 'update_secondary_config') {
      const feeUzs = Number(body.feeUzs);
      const periodDays = Number(body.periodDays);
      if (!Number.isInteger(feeUzs) || feeUzs < 1 || !Number.isInteger(periodDays) || periodDays < 1 || periodDays > 365) {
        return Response.json({ error: 'validation_failed', message: 'Проверьте стоимость и период публикации.' }, { status: 400 });
      }
      await database.batch([
        database.prepare(`UPDATE platform_billing_config SET secondary_listing_fee_uzs = ?, secondary_period_days = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'default'`)
          .bind(feeUzs, periodDays, session.user.id),
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
          VALUES (?, 'user', ?, 'billing.secondary_config_updated', 'billing_config', 'default', ?)`)
          .bind(crypto.randomUUID(), session.user.id, JSON.stringify({ feeUzs, periodDays })),
      ]);
      return Response.json({ message: 'Условия вторичного рынка обновлены.', ...(await adminBillingData(database, localSandboxEnabled(request))) });
    }

    if (action === 'activate_developer') {
      const organizationId = typeof body.organizationId === 'string' ? body.organizationId : '';
      const claimId = typeof body.claimId === 'string' ? body.claimId : '';
      const [claim, subscription] = await Promise.all([
        database.prepare(`SELECT id, amount_uzs, status, provider, provider_reference, metadata_json FROM billing_events WHERE id = ? AND organization_id = ? AND event_type IN ('subscription_charge', 'plan_change') LIMIT 1`).bind(claimId, organizationId).first<{ id: string; amount_uzs: number; status: string; provider: string; provider_reference: string; metadata_json: string }>(),
        database.prepare(`SELECT id, status, current_period_end FROM developer_subscriptions WHERE organization_id = ? LIMIT 1`).bind(organizationId).first<{ id: string; status: string; current_period_end: string }>(),
      ]);
      if (!claim || claim.status !== 'pending' || claim.provider !== 'offline_bank_transfer' || !subscription) return Response.json({ error: 'claim_unavailable', message: 'Заявка на оплату недоступна.' }, { status: 409 });
      const metadata = JSON.parse(claim.metadata_json) as { planId?: string; contractReference?: string };
      if (!metadata.planId || !metadata.contractReference) return Response.json({ error: 'contract_missing', message: 'Номер договора отсутствует.' }, { status: 409 });
      const plan = await database.prepare(`SELECT id, monthly_price_uzs, inventory_limit FROM subscription_plans WHERE id = ? AND is_active = 1 LIMIT 1`).bind(metadata.planId).first<{ id: string; monthly_price_uzs: number; inventory_limit: number }>();
      if (!plan || plan.monthly_price_uzs !== claim.amount_uzs || claim.amount_uzs < 1) return Response.json({ error: 'amount_changed', message: 'Проверьте сумму и тариф; условия изменились после заявки.' }, { status: 409 });
      const usage = await database.prepare(`SELECT COUNT(*) AS count FROM listings WHERE seller_org_id = ? AND market_type = 'PRIMARY_DEVELOPER' AND status IN ('published', 'reserved')`).bind(organizationId).first<{ count: number }>();
      if (Number(usage?.count ?? 0) > plan.inventory_limit) return Response.json({ error: 'inventory_limit', message: 'Число активных квартир превышает лимит тарифа.' }, { status: 409 });
      const now = databaseNow();
      const periodStart = subscription.status === 'active' && subscription.current_period_end > now ? subscription.current_period_end : now;
      const periodEnd = addDays(periodStart, 30);
      await database.batch([
        database.prepare(`INSERT INTO developer_subscription_activations (billing_event_id, organization_id, confirmed_by) VALUES (?, ?, ?)`).bind(claimId, organizationId, session.user.id),
        database.prepare(`UPDATE billing_events SET status = 'paid', period_start = ?, period_end = ?, metadata_json = ? WHERE id = ? AND status = 'pending'`).bind(periodStart, periodEnd, JSON.stringify({ ...metadata, confirmedBy: session.user.id }), claimId),
        database.prepare(`UPDATE developer_subscriptions SET plan_id = ?, status = 'active', current_period_start = ?, current_period_end = ?, auto_renew = 0, updated_at = CURRENT_TIMESTAMP WHERE organization_id = ?`).bind(plan.id, periodStart, periodEnd, organizationId),
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'billing.developer_activated', 'organization', ?, ?)`).bind(crypto.randomUUID(), session.user.id, organizationId, JSON.stringify({ claimId, contractReference: metadata.contractReference, transferReference: claim.provider_reference, amountUzs: claim.amount_uzs, periodEnd })),
      ]);
      return Response.json({ message: 'Договор и перевод подтверждены; подписка активна.', ...(await adminBillingData(database, localSandboxEnabled(request))) });
    }

    if (action === 'reject_payment_claim') {
      const claimId = typeof body.claimId === 'string' ? body.claimId : '';
      const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : '';
      if (!claimId || reason.length < 5) return Response.json({ error: 'validation_failed', message: 'Укажите причину отклонения перевода.' }, { status: 400 });
      const claim = await database.prepare(`SELECT id, listing_id, organization_id, status, provider, metadata_json FROM billing_events WHERE id = ? LIMIT 1`).bind(claimId).first<{ id: string; listing_id: string | null; organization_id: string | null; status: string; provider: string; metadata_json: string }>();
      if (!claim || claim.status !== 'pending' || !['offline_bank_transfer', 'offline_card_transfer'].includes(claim.provider)) return Response.json({ error: 'claim_unavailable', message: 'Заявка уже обработана.' }, { status: 409 });
      await database.batch([
        database.prepare(`UPDATE billing_events SET status = 'failed', metadata_json = ? WHERE id = ? AND status = 'pending'`).bind(JSON.stringify({ ...JSON.parse(claim.metadata_json), rejectionReason: reason, rejectedBy: session.user.id }), claimId),
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'billing.payment_claim_rejected', ?, ?, ?)`).bind(crypto.randomUUID(), session.user.id, claim.listing_id ? 'listing' : 'organization', claim.listing_id ?? claim.organization_id, JSON.stringify({ claimId, reason })),
      ]);
      return Response.json({ message: 'Заявка на перевод отклонена.', ...(await adminBillingData(database, localSandboxEnabled(request))) });
    }

    if (action === 'activate_secondary') {
      const listingId = typeof body.listingId === 'string' ? body.listingId : '';
      const claimId = typeof body.claimId === 'string' ? body.claimId : '';
      if (!listingId || !claimId) return Response.json({ error: 'validation_failed', message: 'Выберите заявку на перевод.' }, { status: 400 });
      const [listing, config, latest, claim] = await Promise.all([
        database.prepare(`SELECT listing.id, listing.market_type, listing.status, owner.verification_status FROM listings listing JOIN secondary_listing_owners owner ON owner.listing_id = listing.id WHERE listing.id = ? LIMIT 1`).bind(listingId).first<{ id: string; market_type: string; status: string; verification_status: string }>(),
        database.prepare(`SELECT secondary_listing_fee_uzs, secondary_period_days FROM platform_billing_config WHERE id = 'default' LIMIT 1`)
          .first<{ secondary_listing_fee_uzs: number; secondary_period_days: number }>(),
        database.prepare(`SELECT purchase.period_end FROM secondary_listing_purchases purchase JOIN billing_events payment ON payment.id = purchase.billing_event_id WHERE payment.status = 'paid' AND payment.provider IN ('offline_bank_transfer', 'offline_card_transfer') AND purchase.listing_id = ? AND purchase.status = 'active' AND purchase.period_end > CURRENT_TIMESTAMP ORDER BY purchase.period_end DESC LIMIT 1`)
          .bind(listingId).first<{ period_end: string }>(),
        database.prepare(`SELECT id, actor_user_id, amount_uzs, status, provider, provider_reference, event_type, idempotency_key FROM billing_events WHERE id = ? AND listing_id = ? LIMIT 1`).bind(claimId, listingId).first<{ id: string; actor_user_id: string; amount_uzs: number; status: string; provider: string; provider_reference: string; event_type: string; idempotency_key: string }>(),
      ]);
      if (!listing || !['SECONDARY_OWNER', 'SECONDARY_AGENCY'].includes(listing.market_type)) return Response.json({ error: 'not_found', message: 'Объявление вторичного рынка не найдено.' }, { status: 404 });
      if (listing.status === 'sold') return Response.json({ error: 'listing_sold', message: 'Проданное объявление нельзя продлить.' }, { status: 409 });
      if (!config || config.secondary_listing_fee_uzs < 1) return Response.json({ error: 'config_missing', message: 'Платный тариф публикации не настроен.' }, { status: 409 });
      if (listing.verification_status !== 'approved' || !claim || claim.status !== 'pending' || !['offline_bank_transfer', 'offline_card_transfer'].includes(claim.provider)) return Response.json({ error: 'claim_unavailable', message: 'Заявка на перевод недоступна или объявление ещё не одобрено.' }, { status: 409 });
      if (claim.amount_uzs !== Number(config.secondary_listing_fee_uzs)) return Response.json({ error: 'amount_changed', message: 'Тариф изменился после заявки. Сверьте сумму вручную и создайте новую заявку.' }, { status: 409 });

      const periodStart = latest?.period_end ?? databaseNow();
      const periodEnd = addDays(periodStart, Number(config.secondary_period_days));
      const purchaseId = crypto.randomUUID();
      await database.batch([
        database.prepare(`UPDATE billing_events SET status = 'paid', period_start = ?, period_end = ?, metadata_json = ? WHERE id = ? AND status = 'pending'`)
          .bind(periodStart, periodEnd, JSON.stringify({ confirmedBy: session.user.id, periodDays: config.secondary_period_days }), claimId),
        database.prepare(`INSERT INTO secondary_listing_purchases
          (id, listing_id, purchaser_user_id, billing_event_id, period_start, period_end, price_uzs, status, idempotency_key)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`)
          .bind(purchaseId, listingId, claim.actor_user_id, claimId, periodStart, periodEnd, Number(config.secondary_listing_fee_uzs), claim.idempotency_key),
        database.prepare(`UPDATE listings SET status = 'published', published_at = COALESCE(published_at, CURRENT_TIMESTAMP), expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(periodEnd, listingId),
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
          VALUES (?, 'user', ?, ?, 'listing', ?, ?)`)
          .bind(crypto.randomUUID(), session.user.id, latest ? 'billing.secondary_renewed' : 'billing.secondary_activated', listingId, JSON.stringify({ periodEnd, amountUzs: config.secondary_listing_fee_uzs, method: claim.provider, reference: claim.provider_reference, claimId })),
      ]);
      return Response.json({ message: latest ? 'Перевод подтверждён, публикация продлена.' : 'Перевод подтверждён, объявление опубликовано.', ...(await adminBillingData(database, localSandboxEnabled(request))) });
    }

    return Response.json({ error: 'validation_failed', message: 'Неизвестное действие биллинга.' }, { status: 400 });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to update admin billing', error);
    return Response.json({ error: 'operation_failed', message: 'Не удалось выполнить операцию биллинга.' }, { status: 500 });
  }
}
