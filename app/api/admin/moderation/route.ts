import { authorizationResponse, requirePermission, requirePlatformPermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

type ModerationRow = {
  complex_id: string;
  name: string;
  developer: string;
  workflow_status: string;
  pending_listings: number;
  submitted_at: string | null;
};

export async function GET(request: Request) {
  try {
    await requirePermission(request, 'VIEW_ADMIN');
    const database = await ensureMarketplaceDatabase();
    const result = await database.prepare(`SELECT
      complex.id AS complex_id, complex.name, organization.name AS developer,
      workflow.status AS workflow_status, workflow.submitted_at,
      COUNT(DISTINCT CASE WHEN listing.status = 'pending_moderation' AND (listing.market_type = 'PRIMARY_DEVELOPER' OR EXISTS
        (SELECT 1 FROM secondary_listing_purchases purchase JOIN billing_events payment ON payment.id = purchase.billing_event_id WHERE payment.status = 'paid' AND payment.provider IN ('offline_bank_transfer', 'offline_card_transfer') AND purchase.listing_id = listing.id AND purchase.status = 'active' AND purchase.period_end > CURRENT_TIMESTAMP)) THEN listing.id END) AS pending_listings
      FROM complexes complex
      JOIN organizations organization ON organization.id = complex.developer_org_id
      JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id
      LEFT JOIN listings listing ON listing.complex_id = complex.id
      WHERE complex.verification_status = 'verified'
        AND (workflow.status = 'pending_moderation' OR (listing.status = 'pending_moderation' AND (listing.market_type = 'PRIMARY_DEVELOPER' OR EXISTS
          (SELECT 1 FROM secondary_listing_purchases purchase JOIN billing_events payment ON payment.id = purchase.billing_event_id WHERE payment.status = 'paid' AND payment.provider IN ('offline_bank_transfer', 'offline_card_transfer') AND purchase.listing_id = listing.id AND purchase.status = 'active' AND purchase.period_end > CURRENT_TIMESTAMP))))
      GROUP BY complex.id, complex.name, organization.name, workflow.status, workflow.submitted_at
      ORDER BY workflow.submitted_at ASC, complex.name ASC`).all<ModerationRow>();
    return Response.json({ queue: result.results ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to load moderation queue', error);
    return Response.json({ error: 'operation_failed', message: 'Не удалось загрузить очередь модерации.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePlatformPermission(request, 'MODERATE_LISTINGS');
    const body = await request.json() as Record<string, unknown>;
    const complexId = typeof body.complexId === 'string' ? body.complexId : '';
    const decision = body.decision === 'publish' || body.decision === 'reject' ? body.decision : null;
    if (!complexId || !decision) return Response.json({ error: 'validation_failed', message: 'Не указано решение по модерации.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const item = await database.prepare(`SELECT complex.id, complex.developer_org_id, workflow.status,
      (SELECT COUNT(*) FROM listings WHERE complex_id = complex.id AND market_type = 'PRIMARY_DEVELOPER' AND status = 'pending_moderation') AS pending_primary,
      (SELECT COUNT(*) FROM listings listing WHERE complex_id = complex.id AND market_type IN ('SECONDARY_OWNER', 'SECONDARY_AGENCY') AND status = 'pending_moderation' AND EXISTS
        (SELECT 1 FROM secondary_listing_purchases purchase JOIN billing_events payment ON payment.id = purchase.billing_event_id WHERE payment.status = 'paid' AND payment.provider IN ('offline_bank_transfer', 'offline_card_transfer') AND purchase.listing_id = listing.id AND purchase.status = 'active' AND purchase.period_end > CURRENT_TIMESTAMP)) AS pending_secondary,
      (SELECT COUNT(*) FROM listings listing
        WHERE listing.complex_id = complex.id AND listing.market_type IN ('SECONDARY_OWNER', 'SECONDARY_AGENCY') AND listing.status = 'pending_moderation'
          AND (NOT EXISTS (SELECT 1 FROM secondary_listing_owners owner WHERE owner.listing_id = listing.id AND owner.verification_status = 'approved')
            OR NOT EXISTS (SELECT 1 FROM secondary_listing_purchases purchase JOIN billing_events payment ON payment.id = purchase.billing_event_id WHERE payment.status = 'paid' AND payment.provider IN ('offline_bank_transfer', 'offline_card_transfer') AND purchase.listing_id = listing.id AND purchase.status = 'active' AND purchase.period_end > CURRENT_TIMESTAMP))) AS invalid_secondary
      FROM complexes complex JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id
      WHERE complex.id = ? AND complex.verification_status = 'verified' LIMIT 1`).bind(complexId).first<{ id: string; developer_org_id: string; status: string; pending_primary: number; pending_secondary: number; invalid_secondary: number }>();
    const pendingListings = Number(item?.pending_primary ?? 0) + Number(item?.pending_secondary ?? 0);
    if (!item || item.status !== 'pending_moderation' && pendingListings === 0) return Response.json({ error: 'not_found', message: 'Заявка на модерацию не найдена.' }, { status: 404 });
    if (decision === 'publish' && Number(item.invalid_secondary) > 0) return Response.json({ error: 'secondary_not_eligible', message: 'У объявления вторичного рынка нет подтверждённых документов или активной оплаты.' }, { status: 409 });
    if (decision === 'publish' && Number(item.pending_primary) > 0) {
      const [subscription, activeUsage] = await Promise.all([
        database.prepare(`SELECT subscription.status, subscription.current_period_end, plan.name, plan.inventory_limit,
          EXISTS (SELECT 1 FROM developer_subscription_activations activation JOIN billing_events event ON event.id = activation.billing_event_id
            WHERE activation.organization_id = subscription.organization_id AND event.status = 'paid' AND event.provider = 'offline_bank_transfer'
              AND event.period_start <= CURRENT_TIMESTAMP AND event.period_end > CURRENT_TIMESTAMP) AS contract_paid
          FROM developer_subscriptions subscription JOIN subscription_plans plan ON plan.id = subscription.plan_id
          WHERE subscription.organization_id = ? LIMIT 1`).bind(item.developer_org_id)
          .first<{ status: string; current_period_end: string; name: string; inventory_limit: number; contract_paid: number }>(),
        database.prepare(`SELECT COUNT(*) AS count FROM listings
          WHERE seller_org_id = ? AND market_type = 'PRIMARY_DEVELOPER' AND status IN ('published', 'reserved')`)
          .bind(item.developer_org_id).first<{ count: number }>(),
      ]);
      const isCurrent = subscription && subscription.status === 'active' && Boolean(subscription.contract_paid) && new Date(`${subscription.current_period_end.replace(' ', 'T')}Z`) > new Date();
      if (!isCurrent) return Response.json({ error: 'subscription_required', message: 'Сначала активируйте подписку застройщика.' }, { status: 409 });
      const nextUsage = Number(activeUsage?.count ?? 0) + Number(item.pending_primary);
      if (nextUsage > Number(subscription.inventory_limit)) {
        return Response.json({ error: 'subscription_limit', message: `Тариф ${subscription.name}: занято ${Number(activeUsage?.count ?? 0)} из ${subscription.inventory_limit}. Для публикации ещё ${item.pending_primary} объявлений нужен тариф выше.` }, { status: 409 });
      }
    }
    const workflowDecision = decision === 'publish' ? 'published' : 'rejected';
    const listingDecision = decision === 'publish' ? 'published' : 'rejected';
    await database.batch([
      database.prepare(`UPDATE complex_publication_workflows SET
        status = CASE WHEN status = 'pending_moderation' THEN ? ELSE status END,
        reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE complex_id = ?`).bind(workflowDecision, complexId),
      database.prepare(`UPDATE listings SET status = ?, published_at = CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE published_at END,
        expires_at = CASE WHEN ? = 'published' AND market_type IN ('SECONDARY_OWNER', 'SECONDARY_AGENCY') THEN
          (SELECT purchase.period_end FROM secondary_listing_purchases purchase JOIN billing_events payment ON payment.id = purchase.billing_event_id WHERE payment.status = 'paid' AND payment.provider IN ('offline_bank_transfer', 'offline_card_transfer') AND purchase.listing_id = listings.id AND purchase.status = 'active' AND purchase.period_end > CURRENT_TIMESTAMP ORDER BY purchase.period_end DESC LIMIT 1)
          ELSE expires_at END, updated_at = CURRENT_TIMESTAMP WHERE complex_id = ? AND status = 'pending_moderation'
          AND (market_type = 'PRIMARY_DEVELOPER' OR EXISTS (SELECT 1 FROM secondary_listing_purchases purchase JOIN billing_events payment ON payment.id = purchase.billing_event_id
            WHERE payment.status = 'paid' AND payment.provider IN ('offline_bank_transfer', 'offline_card_transfer')
              AND purchase.listing_id = listings.id AND purchase.status = 'active' AND purchase.period_end > CURRENT_TIMESTAMP))`)
        .bind(listingDecision, listingDecision, listingDecision, complexId),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, ?, 'complex', ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, decision === 'publish' ? 'moderation.published' : 'moderation.rejected', complexId, JSON.stringify({ pendingListings, pendingPrimary: Number(item.pending_primary), pendingSecondary: Number(item.pending_secondary) })),
    ]);
    return Response.json({ complexId, status: workflowDecision, listings: listingDecision, message: decision === 'publish' ? 'ЖК и объявления опубликованы.' : 'Материалы отклонены на модерации.' });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to moderate complex', error);
    return Response.json({ error: 'operation_failed', message: 'Не удалось сохранить решение модерации.' }, { status: 500 });
  }
}
