import { authorizationResponse, requirePermission } from '@/lib/auth';
import { addDays, databaseNow, expireBillingPeriods } from '@/lib/billing';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

async function adminBillingData(database: D1Database) {
  await expireBillingPeriods(database);
  const [plans, subscriptions, config, secondaryListings, events, totals] = await Promise.all([
    database.prepare(`SELECT id, code, name, inventory_limit, monthly_price_uzs, is_active, sort_order FROM subscription_plans ORDER BY sort_order ASC`).all(),
    database.prepare(`SELECT subscription.id, subscription.organization_id, organization.name AS organization_name,
      subscription.status, subscription.current_period_end, subscription.auto_renew,
      plan.id AS plan_id, plan.code, plan.name AS plan_name, plan.inventory_limit, plan.monthly_price_uzs,
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
      (SELECT purchase.status FROM secondary_listing_purchases purchase WHERE purchase.listing_id = listing.id ORDER BY purchase.created_at DESC LIMIT 1) AS purchase_status,
      (SELECT purchase.period_end FROM secondary_listing_purchases purchase WHERE purchase.listing_id = listing.id ORDER BY purchase.created_at DESC LIMIT 1) AS paid_until
      ,(SELECT event.id FROM billing_events event WHERE event.listing_id = listing.id AND event.status = 'pending' AND event.event_type IN ('secondary_purchase', 'secondary_renewal') ORDER BY event.created_at DESC LIMIT 1) AS payment_claim_id
      ,(SELECT event.provider FROM billing_events event WHERE event.listing_id = listing.id AND event.status = 'pending' AND event.event_type IN ('secondary_purchase', 'secondary_renewal') ORDER BY event.created_at DESC LIMIT 1) AS payment_method
      ,(SELECT event.provider_reference FROM billing_events event WHERE event.listing_id = listing.id AND event.status = 'pending' AND event.event_type IN ('secondary_purchase', 'secondary_renewal') ORDER BY event.created_at DESC LIMIT 1) AS payment_reference
      FROM listings listing JOIN units unit ON unit.id = listing.unit_id JOIN complexes complex ON complex.id = listing.complex_id
      LEFT JOIN organizations organization ON organization.id = listing.seller_org_id
      WHERE listing.market_type IN ('SECONDARY_OWNER', 'SECONDARY_AGENCY')
      ORDER BY CASE WHEN listing.expires_at IS NULL THEN 0 ELSE 1 END, listing.expires_at ASC, complex.name ASC`).all(),
    database.prepare(`SELECT event.id, event.event_type, event.amount_uzs, event.status, event.period_start, event.period_end, event.created_at,
      organization.name AS organization_name, complex.name AS complex_name, unit.unit_number
      FROM billing_events event LEFT JOIN organizations organization ON organization.id = event.organization_id
      LEFT JOIN listings listing ON listing.id = event.listing_id LEFT JOIN complexes complex ON complex.id = listing.complex_id
      LEFT JOIN units unit ON unit.id = listing.unit_id ORDER BY event.created_at DESC LIMIT 20`).all(),
    database.prepare(`SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_uzs ELSE 0 END), 0) AS revenue,
      (SELECT COUNT(*) FROM developer_subscriptions WHERE status IN ('active', 'trialing') AND current_period_end > CURRENT_TIMESTAMP) AS active_subscriptions,
      (SELECT COUNT(*) FROM secondary_listing_purchases WHERE status = 'active' AND period_end > CURRENT_TIMESTAMP) AS active_secondary,
      (SELECT COUNT(*) FROM secondary_listing_purchases WHERE status = 'active' AND period_end BETWEEN CURRENT_TIMESTAMP AND datetime('now', '+7 days')) AS expiring_secondary
      FROM billing_events`).first(),
  ]);
  return {
    plans: plans.results ?? [], subscriptions: subscriptions.results ?? [], config,
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
    await requirePermission(request, 'VIEW_ADMIN');
    const database = await ensureMarketplaceDatabase();
    return Response.json(await adminBillingData(database), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to load admin billing', error);
    return Response.json({ error: 'operation_failed', message: 'Не удалось загрузить биллинг платформы.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission(request, 'MANAGE_BILLING');
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : '';
    const database = await ensureMarketplaceDatabase();

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
      return Response.json({ message: 'Параметры тарифа сохранены.', ...(await adminBillingData(database)) });
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
      return Response.json({ message: 'Условия вторичного рынка обновлены.', ...(await adminBillingData(database)) });
    }

    if (action === 'activate_secondary') {
      const listingId = typeof body.listingId === 'string' ? body.listingId : '';
      const claimId = typeof body.claimId === 'string' ? body.claimId : '';
      if (!listingId || !claimId) return Response.json({ error: 'validation_failed', message: 'Выберите заявку на перевод.' }, { status: 400 });
      const [listing, config, latest, claim] = await Promise.all([
        database.prepare(`SELECT listing.id, listing.market_type, listing.status, owner.verification_status FROM listings listing JOIN secondary_listing_owners owner ON owner.listing_id = listing.id WHERE listing.id = ? LIMIT 1`).bind(listingId).first<{ id: string; market_type: string; status: string; verification_status: string }>(),
        database.prepare(`SELECT secondary_listing_fee_uzs, secondary_period_days FROM platform_billing_config WHERE id = 'default' LIMIT 1`)
          .first<{ secondary_listing_fee_uzs: number; secondary_period_days: number }>(),
        database.prepare(`SELECT period_end FROM secondary_listing_purchases WHERE listing_id = ? AND status = 'active' AND period_end > CURRENT_TIMESTAMP ORDER BY period_end DESC LIMIT 1`)
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
      return Response.json({ message: latest ? 'Перевод подтверждён, публикация продлена.' : 'Перевод подтверждён, объявление опубликовано.', ...(await adminBillingData(database)) });
    }

    return Response.json({ error: 'validation_failed', message: 'Неизвестное действие биллинга.' }, { status: 400 });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to update admin billing', error);
    return Response.json({ error: 'operation_failed', message: 'Не удалось выполнить операцию биллинга.' }, { status: 500 });
  }
}
