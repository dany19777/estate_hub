import { authorizationResponse, requirePermission, requirePlatformPermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { expirePromotions } from '@/lib/promotions';

export const dynamic = 'force-dynamic';

async function adminPromotionData(database: D1Database) {
  await expirePromotions(database);
  const [products, placements, totals] = await Promise.all([
    database.prepare(`SELECT id, code, name, description, target_type, surface, duration_days, price_uzs, boost_weight, is_active, sort_order
      FROM promotion_products ORDER BY sort_order ASC`).all(),
    database.prepare(`SELECT promotion.id, promotion.status, promotion.starts_at, promotion.ends_at, promotion.amount_uzs,
      promotion.provider, promotion.provider_reference, promotion.sponsored_label, organization.name AS organization_name,
      product.id AS product_id, product.code, product.name AS product_name, product.surface,
      complex.name AS complex_name, unit.unit_number
      FROM promotions promotion JOIN promotion_products product ON product.id = promotion.product_id
      JOIN organizations organization ON organization.id = promotion.organization_id
      LEFT JOIN listings listing ON listing.id = promotion.listing_id
      LEFT JOIN complexes complex ON complex.id = COALESCE(promotion.complex_id, listing.complex_id)
      LEFT JOIN units unit ON unit.id = listing.unit_id ORDER BY promotion.created_at DESC LIMIT 50`).all(),
    database.prepare(`SELECT
      COALESCE(SUM(CASE WHEN provider <> 'demo' THEN amount_uzs ELSE 0 END), 0) AS revenue,
      COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active,
      COALESCE(SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END), 0) AS scheduled,
      COALESCE(SUM(CASE WHEN status = 'active' AND ends_at BETWEEN CURRENT_TIMESTAMP AND datetime('now', '+3 days') THEN 1 ELSE 0 END), 0) AS expiring
      FROM promotions`).first(),
  ]);
  const stats = totals as { revenue?: number; active?: number; scheduled?: number; expiring?: number } | null;
  return { products: products.results ?? [], placements: placements.results ?? [], stats: { revenue: Number(stats?.revenue ?? 0), active: Number(stats?.active ?? 0), scheduled: Number(stats?.scheduled ?? 0), expiring: Number(stats?.expiring ?? 0) } };
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, 'VIEW_ADMIN');
    const database = await ensureMarketplaceDatabase();
    return Response.json(await adminPromotionData(database), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to load admin promotions', error);
    return Response.json({ error: 'operation_failed', message: 'Не удалось загрузить продвижение.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePlatformPermission(request, 'MANAGE_PROMOTIONS');
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : '';
    const database = await ensureMarketplaceDatabase();
    if (action === 'update_product') {
      const productId = typeof body.productId === 'string' ? body.productId : '';
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const durationDays = Number(body.durationDays);
      const priceUzs = Number(body.priceUzs);
      const boostWeight = Number(body.boostWeight);
      const isActive = body.isActive === false ? 0 : 1;
      if (!productId || !name || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365 || !Number.isInteger(priceUzs) || priceUzs < 0 || !Number.isInteger(boostWeight) || boostWeight < 0 || boostWeight > 1000) {
        return Response.json({ error: 'validation_failed', message: 'Проверьте название, срок, стоимость и приоритет.' }, { status: 400 });
      }
      const result = await database.prepare(`UPDATE promotion_products SET name = ?, duration_days = ?, price_uzs = ?, boost_weight = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(name, durationDays, priceUzs, boostWeight, isActive, productId).run();
      if (!result.meta.changes) return Response.json({ error: 'not_found', message: 'Формат продвижения не найден.' }, { status: 404 });
      await database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'user', ?, 'promotion.product_updated', 'promotion_product', ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, productId, JSON.stringify({ name, durationDays, priceUzs, boostWeight, isActive: Boolean(isActive) })).run();
      return Response.json({ message: 'Формат продвижения обновлён.', ...(await adminPromotionData(database)) });
    }
    if (action === 'cancel') {
      const promotionId = typeof body.promotionId === 'string' ? body.promotionId : '';
      const result = await database.prepare(`UPDATE promotions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('active', 'scheduled')`).bind(promotionId).run();
      if (!result.meta.changes) return Response.json({ error: 'not_found', message: 'Активное размещение не найдено.' }, { status: 404 });
      await database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'user', ?, 'promotion.cancelled', 'promotion', ?, '{}')`).bind(crypto.randomUUID(), session.user.id, promotionId).run();
      return Response.json({ message: 'Размещение остановлено.', ...(await adminPromotionData(database)) });
    }
    return Response.json({ error: 'validation_failed', message: 'Неизвестное действие.' }, { status: 400 });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to update admin promotions', error);
    return Response.json({ error: 'operation_failed', message: 'Не удалось обновить продвижение.' }, { status: 500 });
  }
}
