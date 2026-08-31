import { env } from 'cloudflare:workers';

import { complexes as complexSeeds, districts, organizations, units } from '@/db/seeds';
import { indexStatements, schemaStatements } from '@/db/schema';
import { buildCatalog } from '@/lib/catalog-service';
import { expireBillingPeriods } from '@/lib/billing';
import { expirePromotions } from '@/lib/promotions';
import type { ComplexDetail, ComplexListing, ComplexRecord, ListingDetail, ListingPriceHistoryEntry, ListingRecord, MarketType, SellerType } from '@/lib/marketplace';

type MarketplaceEnv = Cloudflare.Env & { DB: D1Database };

type ComplexRow = {
  id: string;
  slug: string;
  name: string;
  city: string;
  district: string;
  address: string;
  developer: string;
  developer_verification: string;
  complex_verification: string;
  completion_status: ComplexRecord['completionStatus'];
  completion_label: string;
  hero_image_url: string;
  featured: number;
  rating: number;
  map_x: number;
  map_y: number;
};

type ListingRow = {
  id: string;
  complex_id: string;
  unit_number: string;
  rooms: number;
  area_sqm: number;
  floor_number: number;
  total_floors: number;
  finish: string;
  price_uzs: number;
  market_type: MarketType;
  seller_type: SellerType;
  reserve_enabled: number;
  published_at: string;
};

type ComplexDetailRow = {
  id: string;
  description: string;
};

type ComplexListingRow = ListingRow & {
  seller: string | null;
  seller_verification: string | null;
  contact_phone: string | null;
  promoted: number;
  sponsored_label: string | null;
};

type ListingDetailRow = ComplexListingRow & {
  expires_at: string | null;
  availability_status: string;
  building_name: string;
  complex_slug: string;
  complex_name: string;
  city: string;
  district: string;
  address: string;
  hero_image_url: string;
  completion_label: string;
  complex_verification: string;
  description: string;
};

type PriceHistoryRow = { id: string; old_price_uzs: number | null; new_price_uzs: number; reason: string; changed_at: string };

type PromotionSignalRow = { complex_id: string; surface: string; boost_weight: number };

let initialization: Promise<void> | null = null;

function marketplaceDatabase() {
  const database = (env as MarketplaceEnv).DB;
  if (!database) throw new Error('Marketplace database binding DB is not configured');
  return database;
}

async function seedMarketplace(database: D1Database) {
  const statements: D1PreparedStatement[] = [
    database.prepare(`INSERT OR IGNORE INTO regions (id, slug, name_ru, name_uz, name_en) VALUES (?, ?, ?, ?, ?)`)
      .bind('region-samarkand', 'samarkand', 'Самаркандская область', 'Samarqand viloyati', 'Samarkand Region'),
    database.prepare(`INSERT OR IGNORE INTO cities (id, region_id, slug, name_ru, name_uz, name_en) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind('city-samarkand', 'region-samarkand', 'samarkand', 'Самарканд', 'Samarqand', 'Samarkand'),
  ];

  const plans = [
    ['plan-start', 'START', 'Start', 5, 1_500_000, 10],
    ['plan-business', 'BUSINESS', 'Business', 25, 4_500_000, 20],
    ['plan-pro', 'PRO', 'Pro', 100, 12_000_000, 30],
    ['plan-enterprise', 'ENTERPRISE', 'Enterprise', 1000, 0, 40],
  ] as const;
  for (const plan of plans) {
    statements.push(database.prepare(`INSERT OR IGNORE INTO subscription_plans
      (id, code, name, inventory_limit, monthly_price_uzs, sort_order) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(...plan));
  }
  statements.push(database.prepare(`INSERT OR IGNORE INTO platform_billing_config
    (id, secondary_listing_fee_uzs, secondary_period_days) VALUES ('default', 350000, 30)`));
  const promotionProducts = [
    ['promotion-featured-complex', 'FEATURED_COMPLEX', 'Featured ЖК', 'Приоритетная позиция ЖК в рекомендательной выдаче.', 'complex', 'search_homepage', 7, 1_800_000, 70, 10],
    ['promotion-featured-listing', 'FEATURED_LISTING', 'Featured квартира', 'Выделение отдельной квартиры внутри ЖК и в результатах.', 'listing', 'search', 7, 600_000, 50, 20],
    ['promotion-search', 'SEARCH_PROMOTION', 'Продвижение в поиске', 'Повышенный приоритет в рекомендуемой сортировке каталога.', 'complex', 'search', 7, 1_200_000, 90, 30],
    ['promotion-homepage', 'HOMEPAGE_PROMOTION', 'Продвижение на главной', 'Размещение в верхней части подборки на главной странице.', 'complex', 'homepage', 7, 2_500_000, 100, 40],
    ['promotion-special', 'SPECIAL_CAMPAIGN', 'Специальная кампания', 'Расширенное размещение на главной и в поиске.', 'complex', 'special', 14, 5_000_000, 120, 50],
  ] as const;
  for (const product of promotionProducts) {
    statements.push(database.prepare(`INSERT OR IGNORE INTO promotion_products
      (id, code, name, description, target_type, surface, duration_days, price_uzs, boost_weight, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(...product));
  }

  for (const district of districts) {
    statements.push(database.prepare(`INSERT OR IGNORE INTO districts (id, city_id, slug, name_ru, name_uz, name_en) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(district[0], 'city-samarkand', district[1], district[2], district[3], district[4]));
  }
  for (const organization of organizations) {
    statements.push(database.prepare(`INSERT OR IGNORE INTO organizations (id, slug, name, organization_type, verification_status, verified_at) VALUES (?, ?, ?, ?, 'verified', CURRENT_TIMESTAMP)`)
      .bind(organization[0], organization[1], organization[2], organization[3]));
    statements.push(database.prepare(`INSERT OR IGNORE INTO verification_cases (id, subject_type, subject_id, status, risk_level, reviewed_by, reviewed_at) VALUES (?, 'organization', ?, 'approved', 'low', 'system-seed', CURRENT_TIMESTAMP)`)
      .bind(`verification-${organization[0]}`, organization[0]));
    statements.push(database.prepare(`INSERT OR IGNORE INTO organization_sales_settings (organization_id, new_lead_sla_minutes, sticky_assignment) VALUES (?, 45, 1)`).bind(organization[0]));
  }
  statements.push(database.prepare(`INSERT OR IGNORE INTO organizations (id, slug, name, organization_type, verification_status) VALUES ('org-nurafshon-build', 'nurafshon-build', 'Nurafshon Build', 'developer', 'pending')`));
  statements.push(database.prepare(`INSERT OR IGNORE INTO verification_cases (id, subject_type, subject_id, status, risk_level) VALUES ('verification-org-nurafshon-build', 'organization', 'org-nurafshon-build', 'submitted', 'medium')`));
  statements.push(database.prepare(`INSERT OR IGNORE INTO organization_sales_settings (organization_id, new_lead_sla_minutes, sticky_assignment) VALUES ('org-nurafshon-build', 45, 1)`));
  for (const organization of organizations.filter((item) => item[3] === 'developer')) {
    statements.push(database.prepare(`INSERT OR IGNORE INTO developer_subscriptions
      (id, organization_id, plan_id, status, current_period_start, current_period_end)
      VALUES (?, ?, 'plan-start', 'trialing', CURRENT_TIMESTAMP, datetime('now', '+30 days'))`)
      .bind(`subscription-${organization[0]}`, organization[0]));
  }
  statements.push(database.prepare(`INSERT OR IGNORE INTO developer_subscriptions
    (id, organization_id, plan_id, status, current_period_start, current_period_end)
    VALUES ('subscription-org-nurafshon-build', 'org-nurafshon-build', 'plan-start', 'trialing', CURRENT_TIMESTAMP, datetime('now', '+30 days'))`));
  for (const complex of complexSeeds) {
    statements.push(database.prepare(`INSERT OR IGNORE INTO complexes (
      id, slug, district_id, developer_org_id, name, address, description, completion_status,
      completion_label, verification_status, hero_image_url, featured, rating, map_x, map_y
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?, ?, ?, ?)`)
      .bind(complex.id, complex.slug, complex.districtId, complex.developerId, complex.name, complex.address, complex.description, complex.completionStatus, complex.completionLabel, complex.image, complex.featured, complex.rating, complex.mapX, complex.mapY));
    statements.push(database.prepare(`INSERT OR IGNORE INTO verification_cases (id, subject_type, subject_id, status, risk_level, reviewed_by, reviewed_at) VALUES (?, 'complex', ?, 'approved', 'low', 'system-seed', CURRENT_TIMESTAMP)`)
      .bind(`verification-${complex.id}`, complex.id));
    statements.push(database.prepare(`INSERT OR IGNORE INTO complex_publication_workflows (complex_id, status, submitted_at, reviewed_at) VALUES (?, 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
      .bind(complex.id));

    const buildingId = `building-${complex.id}`;
    const sectionId = `section-${complex.id}`;
    statements.push(database.prepare(`INSERT OR IGNORE INTO buildings (id, complex_id, name, total_floors, completion_status) VALUES (?, ?, 'Корпус A', ?, ?)`)
      .bind(buildingId, complex.id, complex.floors, complex.completionStatus));
    statements.push(database.prepare(`INSERT OR IGNORE INTO sections (id, building_id, name) VALUES (?, ?, 'Секция 1')`)
      .bind(sectionId, buildingId));
    const mediaUrls = [
      complex.image,
      'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1000&q=88',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=88',
      'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1000&q=88',
    ];
    mediaUrls.forEach((url, index) => statements.push(database.prepare(`INSERT OR IGNORE INTO media_assets (id, entity_type, entity_id, media_type, url, alt_text, sort_order) VALUES (?, 'complex', ?, 'image', ?, ?, ?)`)
      .bind(`media-${complex.id}-${index}`, complex.id, url, `${complex.name} — фото ${index + 1}`, index)));
  }

  for (const unit of units) {
    const [unitNumber, complexId, rooms, areaSqm, floorNumber, finish, priceUzs, marketType, sellerType, reserveEnabled] = unit;
    const complex = complexSeeds.find((item) => item.id === complexId);
    if (!complex) continue;
    const buildingId = `building-${complexId}`;
    const sectionId = `section-${complexId}`;
    const floorId = `floor-${complexId}-${floorNumber}`;
    const unitId = `unit-${complexId}-${unitNumber}`;
    const listingId = `listing-${complexId}-${unitNumber}`;
    const sellerOrgId = sellerType === 'developer' ? complex.developerId : sellerType === 'agency' ? 'org-silk-road-agency' : null;

    statements.push(database.prepare(`INSERT OR IGNORE INTO floors (id, section_id, floor_number) VALUES (?, ?, ?)`)
      .bind(floorId, sectionId, floorNumber));
    statements.push(database.prepare(`INSERT OR IGNORE INTO units (
      id, complex_id, building_id, section_id, floor_id, unit_number, rooms, area_sqm,
      floor_number, total_floors, finish, availability_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`)
      .bind(unitId, complexId, buildingId, sectionId, floorId, unitNumber, rooms, areaSqm, floorNumber, complex.floors, finish));
    statements.push(database.prepare(`INSERT OR IGNORE INTO listings (
      id, unit_id, complex_id, seller_org_id, market_type, seller_type, price_uzs, status, reserve_enabled, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, CURRENT_TIMESTAMP)`)
      .bind(listingId, unitId, complexId, sellerOrgId, marketType, sellerType, priceUzs, reserveEnabled));
    statements.push(database.prepare(`INSERT OR IGNORE INTO listing_price_history (id, listing_id, old_price_uzs, new_price_uzs, reason, changed_by) VALUES (?, ?, NULL, ?, 'initial_publication', 'system-seed')`)
      .bind(`price-${listingId}-initial`, listingId, priceUzs));
  }

  statements.push(database.prepare(`INSERT OR IGNORE INTO promotions
    (id, product_id, organization_id, complex_id, status, starts_at, ends_at, amount_uzs, provider, provider_reference, idempotency_key, sponsored_label)
    VALUES ('promotion-demo-bogishamol', 'promotion-featured-complex', 'org-samarkand-development', 'complex-bogishamol', 'active', CURRENT_TIMESTAMP, datetime('now', '+14 days'), 0, 'demo', 'demo:featured-bogishamol', 'demo-featured-bogishamol', 'Реклама')`));

  statements.push(database.prepare(`INSERT OR IGNORE INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES ('audit-marketplace-seed', 'system', 'system-seed', 'marketplace.seeded', 'catalog', 'samarkand', '{"source":"mvp-seed"}')`));
  await database.batch(statements);
}

export async function ensureMarketplaceDatabase() {
  if (!initialization) {
    const database = marketplaceDatabase();
    initialization = (async () => {
      await database.batch(schemaStatements.map((statement) => database.prepare(statement)));
      await database.batch(indexStatements.map((statement) => database.prepare(statement)));
      await seedMarketplace(database);
      await database.prepare('PRAGMA optimize').run();
    })().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  await initialization;
  return marketplaceDatabase();
}

export async function readMarketplaceData() {
  const database = await ensureMarketplaceDatabase();
  await Promise.all([expireBillingPeriods(database), expirePromotions(database)]);
  const [complexResult, listingResult, promotionResult] = await Promise.all([
    database.prepare(`SELECT
      c.id, c.slug, c.name, city.name_ru AS city, d.name_ru AS district, c.address,
      o.name AS developer, o.verification_status AS developer_verification,
      c.verification_status AS complex_verification, c.completion_status, c.completion_label,
      c.hero_image_url, c.featured, c.rating, c.map_x, c.map_y
      FROM complexes c
      JOIN districts d ON d.id = c.district_id
      JOIN cities city ON city.id = d.city_id
      JOIN organizations o ON o.id = c.developer_org_id
      JOIN complex_publication_workflows workflow ON workflow.complex_id = c.id AND workflow.status = 'published'
      ORDER BY c.featured DESC, c.rating DESC, c.name ASC`).all<ComplexRow>(),
    database.prepare(`SELECT
      l.id, l.complex_id, u.unit_number, u.rooms, u.area_sqm, u.floor_number,
      u.total_floors, u.finish, l.price_uzs, l.market_type, l.seller_type,
      l.reserve_enabled, l.published_at
      FROM listings l
      JOIN units u ON u.id = l.unit_id
      WHERE l.status = 'published' AND u.availability_status = 'available'
      ORDER BY l.published_at DESC`).all<ListingRow>(),
    database.prepare(`SELECT COALESCE(promotion.complex_id, listing.complex_id) AS complex_id,
      product.surface, MAX(product.boost_weight) AS boost_weight
      FROM promotions promotion JOIN promotion_products product ON product.id = promotion.product_id
      LEFT JOIN listings listing ON listing.id = promotion.listing_id
      WHERE promotion.status = 'active' AND promotion.starts_at <= CURRENT_TIMESTAMP AND promotion.ends_at > CURRENT_TIMESTAMP
      GROUP BY COALESCE(promotion.complex_id, listing.complex_id), product.surface`).all<PromotionSignalRow>(),
  ]);

  const promotionSignals = new Map<string, { search: number; homepage: number }>();
  for (const signal of promotionResult.results ?? []) {
    const current = promotionSignals.get(signal.complex_id) ?? { search: 0, homepage: 0 };
    if (['search', 'search_homepage', 'special'].includes(signal.surface)) current.search = Math.max(current.search, Number(signal.boost_weight));
    if (['homepage', 'search_homepage', 'special'].includes(signal.surface)) current.homepage = Math.max(current.homepage, Number(signal.boost_weight));
    promotionSignals.set(signal.complex_id, current);
  }

  const complexes: ComplexRecord[] = (complexResult.results ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    district: row.district,
    address: row.address,
    developer: row.developer,
    developerVerified: row.developer_verification === 'verified',
    complexVerified: row.complex_verification === 'verified',
    completionStatus: row.completion_status,
    completionLabel: row.completion_label,
    image: row.hero_image_url,
    featured: Boolean(row.featured),
    rating: row.rating,
    mapX: row.map_x,
    mapY: row.map_y,
    promotionSearchWeight: promotionSignals.get(row.id)?.search ?? 0,
    promotionHomepageWeight: promotionSignals.get(row.id)?.homepage ?? 0,
  }));
  const listings: ListingRecord[] = (listingResult.results ?? []).map((row) => ({
    id: row.id,
    complexId: row.complex_id,
    unitNumber: row.unit_number,
    rooms: row.rooms,
    areaSqm: row.area_sqm,
    floorNumber: row.floor_number,
    totalFloors: row.total_floors,
    finish: row.finish,
    priceUzs: row.price_uzs,
    marketType: row.market_type,
    sellerType: row.seller_type,
    reserveEnabled: Boolean(row.reserve_enabled),
    publishedAt: row.published_at,
  }));

  return { complexes, listings };
}

export async function readComplexDetail(slug: string): Promise<ComplexDetail | null> {
  const database = await ensureMarketplaceDatabase();
  const { complexes, listings } = await readMarketplaceData();
  const record = await database.prepare(`SELECT id, description FROM complexes WHERE slug = ? LIMIT 1`).bind(slug).first<ComplexDetailRow>();
  if (!record) return null;

  const summary = buildCatalog(complexes, listings, {}).items.find((item) => item.id === record.id);
  if (!summary) return null;

  const [listingResult, mediaResult] = await Promise.all([
    database.prepare(`SELECT
      l.id, l.complex_id, u.unit_number, u.rooms, u.area_sqm, u.floor_number,
      u.total_floors, u.finish, l.price_uzs, l.market_type, l.seller_type,
      l.reserve_enabled, l.published_at,
      COALESCE(o.name, seller_user.full_name, CASE WHEN l.seller_type = 'owner' THEN 'Проверенный собственник' ELSE 'Проверенный продавец' END) AS seller,
      COALESCE(o.verification_status, secondary_owner.verification_status, CASE WHEN l.status = 'published' THEN 'approved' END) AS seller_verification,
      secondary_owner.contact_phone
      , EXISTS(SELECT 1 FROM promotions promotion JOIN promotion_products product ON product.id = promotion.product_id
        WHERE promotion.listing_id = l.id AND promotion.status = 'active' AND promotion.starts_at <= CURRENT_TIMESTAMP AND promotion.ends_at > CURRENT_TIMESTAMP) AS promoted
      , (SELECT promotion.sponsored_label FROM promotions promotion WHERE promotion.listing_id = l.id AND promotion.status = 'active'
        AND promotion.starts_at <= CURRENT_TIMESTAMP AND promotion.ends_at > CURRENT_TIMESTAMP ORDER BY promotion.ends_at DESC LIMIT 1) AS sponsored_label
      FROM listings l
      JOIN units u ON u.id = l.unit_id
      LEFT JOIN organizations o ON o.id = l.seller_org_id
      LEFT JOIN secondary_listing_owners secondary_owner ON secondary_owner.listing_id = l.id
      LEFT JOIN users seller_user ON seller_user.id = secondary_owner.seller_user_id
      WHERE l.complex_id = ? AND l.status = 'published' AND u.availability_status = 'available'
      ORDER BY l.price_uzs ASC`).bind(record.id).all<ComplexListingRow>(),
    database.prepare(`SELECT url FROM media_assets WHERE entity_type = 'complex' AND entity_id = ? AND media_type = 'image' ORDER BY sort_order ASC`).bind(record.id).all<{ url: string }>(),
  ]);

  const detailListings: ComplexListing[] = (listingResult.results ?? []).map((row) => ({
    id: row.id,
    complexId: row.complex_id,
    unitNumber: row.unit_number,
    rooms: row.rooms,
    areaSqm: row.area_sqm,
    floorNumber: row.floor_number,
    totalFloors: row.total_floors,
    finish: row.finish,
    priceUzs: row.price_uzs,
    marketType: row.market_type,
    sellerType: row.seller_type,
    reserveEnabled: Boolean(row.reserve_enabled),
    publishedAt: row.published_at,
    seller: row.seller ?? 'Проверенный продавец',
    sellerVerified: ['verified', 'approved'].includes(row.seller_verification ?? ''),
    contactPhone: row.contact_phone,
    promoted: Boolean(row.promoted),
    sponsoredLabel: row.sponsored_label,
  }));

  return {
    summary,
    description: record.description,
    gallery: (mediaResult.results ?? []).map((item) => item.url),
    listings: detailListings,
  };
}

export async function readListingDetail(id: string): Promise<ListingDetail | null> {
  const database = await ensureMarketplaceDatabase();
  await expireBillingPeriods(database);
  const row = await database.prepare(`SELECT
    listing.id, listing.complex_id, unit.unit_number, unit.rooms, unit.area_sqm, unit.floor_number, unit.total_floors, unit.finish,
    listing.price_uzs, listing.market_type, listing.seller_type, listing.reserve_enabled, listing.published_at, listing.expires_at,
    unit.availability_status, building.name AS building_name,
    COALESCE(organization.name, seller_user.full_name, CASE WHEN listing.seller_type = 'owner' THEN 'Проверенный собственник' ELSE 'Проверенный продавец' END) AS seller,
    COALESCE(organization.verification_status, secondary_owner.verification_status, CASE WHEN listing.status = 'published' THEN 'approved' END) AS seller_verification,
    secondary_owner.contact_phone,
    EXISTS(SELECT 1 FROM promotions promotion WHERE promotion.listing_id = listing.id AND promotion.status = 'active' AND promotion.starts_at <= CURRENT_TIMESTAMP AND promotion.ends_at > CURRENT_TIMESTAMP) AS promoted,
    (SELECT promotion.sponsored_label FROM promotions promotion WHERE promotion.listing_id = listing.id AND promotion.status = 'active' AND promotion.starts_at <= CURRENT_TIMESTAMP AND promotion.ends_at > CURRENT_TIMESTAMP ORDER BY promotion.ends_at DESC LIMIT 1) AS sponsored_label,
    complex.slug AS complex_slug, complex.name AS complex_name, city.name_ru AS city, district.name_ru AS district, complex.address,
    complex.hero_image_url, complex.completion_label, complex.verification_status AS complex_verification, complex.description
    FROM listings listing
    JOIN units unit ON unit.id = listing.unit_id
    JOIN buildings building ON building.id = unit.building_id
    JOIN complexes complex ON complex.id = listing.complex_id
    JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id AND workflow.status = 'published'
    JOIN districts district ON district.id = complex.district_id JOIN cities city ON city.id = district.city_id
    LEFT JOIN organizations organization ON organization.id = listing.seller_org_id
    LEFT JOIN secondary_listing_owners secondary_owner ON secondary_owner.listing_id = listing.id
    LEFT JOIN users seller_user ON seller_user.id = secondary_owner.seller_user_id
    WHERE listing.id = ? AND listing.status = 'published' AND unit.availability_status = 'available' LIMIT 1`).bind(id).first<ListingDetailRow>();
  if (!row) return null;
  const [historyResult, mediaResult] = await Promise.all([
    database.prepare(`SELECT id, old_price_uzs, new_price_uzs, reason, changed_at FROM listing_price_history WHERE listing_id = ? ORDER BY changed_at ASC, id ASC`).bind(id).all<PriceHistoryRow>(),
    database.prepare(`SELECT url FROM media_assets WHERE
      ((entity_type = 'listing' AND entity_id = ?) OR (entity_type = 'unit' AND entity_id = (SELECT unit_id FROM listings WHERE id = ?)) OR (entity_type = 'complex' AND entity_id = ?))
      AND media_type IN ('image', 'floor_plan')
      ORDER BY CASE entity_type WHEN 'listing' THEN 1 WHEN 'unit' THEN 2 ELSE 3 END, sort_order ASC`).bind(id, id, row.complex_id).all<{ url: string }>(),
  ]);
  const priceHistory: ListingPriceHistoryEntry[] = (historyResult.results ?? []).map((item) => ({ id: item.id, oldPriceUzs: item.old_price_uzs, newPriceUzs: item.new_price_uzs, reason: item.reason, changedAt: item.changed_at }));
  return {
    listing: {
      id: row.id, complexId: row.complex_id, unitNumber: row.unit_number, rooms: row.rooms, areaSqm: row.area_sqm,
      floorNumber: row.floor_number, totalFloors: row.total_floors, finish: row.finish, priceUzs: row.price_uzs,
      marketType: row.market_type, sellerType: row.seller_type, reserveEnabled: Boolean(row.reserve_enabled), publishedAt: row.published_at,
      seller: row.seller ?? 'Проверенный продавец', sellerVerified: ['verified', 'approved'].includes(row.seller_verification ?? ''), contactPhone: row.contact_phone,
      promoted: Boolean(row.promoted), sponsoredLabel: row.sponsored_label, expiresAt: row.expires_at, availabilityStatus: row.availability_status, buildingName: row.building_name,
    },
    complex: { id: row.complex_id, slug: row.complex_slug, name: row.complex_name, city: row.city, district: row.district, address: row.address, image: row.hero_image_url, completionLabel: row.completion_label, complexVerified: row.complex_verification === 'verified' },
    description: row.description,
    gallery: (mediaResult.results ?? []).map((item) => item.url),
    priceHistory,
  };
}
