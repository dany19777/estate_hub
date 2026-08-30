import { authorizationResponse, requirePermission } from '@/lib/auth';
import { addDays, databaseNow } from '@/lib/billing';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { paymentProvider } from '@/lib/payment-provider';
import { expirePromotions } from '@/lib/promotions';

export const dynamic = 'force-dynamic';

type ProductRow = { id: string; code: string; name: string; description: string; target_type: 'complex' | 'listing'; surface: string; duration_days: number; price_uzs: number; boost_weight: number; is_active: number };

async function developerPromotionData(database: D1Database, organizationId: string) {
  await expirePromotions(database);
  const [products, complexes, listings, promotions] = await Promise.all([
    database.prepare(`SELECT id, code, name, description, target_type, surface, duration_days, price_uzs, boost_weight, is_active
      FROM promotion_products WHERE is_active = 1 ORDER BY sort_order ASC`).all(),
    database.prepare(`SELECT complex.id, complex.name, complex.slug, complex.hero_image_url
      FROM complexes complex JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id
      WHERE complex.developer_org_id = ? AND workflow.status = 'published' ORDER BY complex.name ASC`).bind(organizationId).all(),
    database.prepare(`SELECT listing.id, unit.unit_number, complex.id AS complex_id, complex.name AS complex_name
      FROM listings listing JOIN units unit ON unit.id = listing.unit_id JOIN complexes complex ON complex.id = listing.complex_id
      WHERE listing.seller_org_id = ? AND listing.status IN ('published', 'reserved') ORDER BY complex.name ASC, unit.unit_number ASC`).bind(organizationId).all(),
    database.prepare(`SELECT promotion.id, promotion.product_id, promotion.complex_id, promotion.listing_id, promotion.status,
      promotion.starts_at, promotion.ends_at, promotion.amount_uzs, promotion.provider_reference, promotion.sponsored_label,
      product.code, product.name AS product_name, product.surface, product.target_type,
      complex.name AS complex_name, unit.unit_number
      FROM promotions promotion JOIN promotion_products product ON product.id = promotion.product_id
      LEFT JOIN complexes complex ON complex.id = COALESCE(promotion.complex_id, (SELECT listing.complex_id FROM listings listing WHERE listing.id = promotion.listing_id))
      LEFT JOIN listings listing ON listing.id = promotion.listing_id LEFT JOIN units unit ON unit.id = listing.unit_id
      WHERE promotion.organization_id = ? ORDER BY promotion.created_at DESC LIMIT 30`).bind(organizationId).all(),
  ]);
  return { products: products.results ?? [], complexes: complexes.results ?? [], listings: listings.results ?? [], promotions: promotions.results ?? [] };
}

export async function GET(request: Request) {
  try {
    const session = await requirePermission(request, 'VIEW_DEVELOPER_DASHBOARD');
    if (!session.organization) return Response.json({ error: 'organization_required', message: 'Кабинет не связан с организацией.' }, { status: 403 });
    const database = await ensureMarketplaceDatabase();
    return Response.json(await developerPromotionData(database, session.organization.id), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to load developer promotions', error);
    return Response.json({ error: 'operation_failed', message: 'Не удалось загрузить продвижение.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(request, 'MANAGE_PROMOTIONS');
    if (!session.organization) return Response.json({ error: 'organization_required', message: 'Кабинет не связан с организацией.' }, { status: 403 });
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
    if (!idempotencyKey) return Response.json({ error: 'idempotency_required', message: 'Повторите действие: отсутствует ключ операции.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const duplicate = await database.prepare(`SELECT id FROM promotions WHERE idempotency_key = ? LIMIT 1`).bind(idempotencyKey).first<{ id: string }>();
    if (duplicate) return Response.json({ duplicate: true, message: 'Размещение уже оплачено.', ...(await developerPromotionData(database, session.organization.id)) });
    const body = await request.json() as Record<string, unknown>;
    const productId = typeof body.productId === 'string' ? body.productId : '';
    const targetId = typeof body.targetId === 'string' ? body.targetId : '';
    const product = await database.prepare(`SELECT id, code, name, description, target_type, surface, duration_days, price_uzs, boost_weight, is_active
      FROM promotion_products WHERE id = ? AND is_active = 1 LIMIT 1`).bind(productId).first<ProductRow>();
    if (!product || !targetId) return Response.json({ error: 'validation_failed', message: 'Выберите формат и объект продвижения.' }, { status: 400 });

    let complexId: string | null = null;
    let listingId: string | null = null;
    if (product.target_type === 'complex') {
      const target = await database.prepare(`SELECT complex.id FROM complexes complex JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id
        WHERE complex.id = ? AND complex.developer_org_id = ? AND workflow.status = 'published' LIMIT 1`).bind(targetId, session.organization.id).first<{ id: string }>();
      if (!target) return Response.json({ error: 'target_not_found', message: 'Можно продвигать только опубликованный ЖК своей компании.' }, { status: 404 });
      complexId = target.id;
    } else {
      const target = await database.prepare(`SELECT id FROM listings WHERE id = ? AND seller_org_id = ? AND status IN ('published', 'reserved') LIMIT 1`)
        .bind(targetId, session.organization.id).first<{ id: string }>();
      if (!target) return Response.json({ error: 'target_not_found', message: 'Можно продвигать только активную квартиру своей компании.' }, { status: 404 });
      listingId = target.id;
    }

    const latest = await database.prepare(`SELECT ends_at FROM promotions WHERE product_id = ? AND organization_id = ?
      AND COALESCE(complex_id, '') = COALESCE(?, '') AND COALESCE(listing_id, '') = COALESCE(?, '')
      AND status IN ('active', 'scheduled') AND ends_at > CURRENT_TIMESTAMP ORDER BY ends_at DESC LIMIT 1`)
      .bind(product.id, session.organization.id, complexId, listingId).first<{ ends_at: string }>();
    const startsAt = latest?.ends_at ?? databaseNow();
    const endsAt = addDays(startsAt, Number(product.duration_days));
    const promotionId = crypto.randomUUID();
    const payment = await paymentProvider().chargeBilling({ billingId: promotionId, amountUzs: Number(product.price_uzs), idempotencyKey, productType: 'promotion' });
    await database.batch([
      database.prepare(`INSERT INTO promotions
        (id, product_id, organization_id, complex_id, listing_id, status, starts_at, ends_at, amount_uzs, provider, provider_reference, idempotency_key, sponsored_label, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Реклама', ?)`)
        .bind(promotionId, product.id, session.organization.id, complexId, listingId, latest ? 'scheduled' : 'active', startsAt, endsAt, Number(product.price_uzs), payment.provider, payment.reference, idempotencyKey, session.user.id),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'user', ?, 'promotion.purchased', 'promotion', ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, promotionId, JSON.stringify({ productId: product.id, productCode: product.code, targetId, startsAt, endsAt, amountUzs: product.price_uzs })),
    ]);
    return Response.json({ message: latest ? 'Продвижение оплачено и поставлено следующим периодом.' : 'Продвижение запущено.', ...(await developerPromotionData(database, session.organization.id)) });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to purchase promotion', error);
    return Response.json({ error: 'operation_failed', message: 'Не удалось запустить продвижение.' }, { status: 500 });
  }
}
