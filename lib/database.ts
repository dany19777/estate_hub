import { env } from 'cloudflare:workers';

import { complexes as complexSeeds, districts, organizations, units } from '@/db/seeds';
import { indexStatements, schemaStatements } from '@/db/schema';
import { buildCatalog } from '@/lib/catalog-service';
import type { ComplexDetail, ComplexListing, ComplexRecord, ListingRecord, MarketType, SellerType } from '@/lib/marketplace';

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
};

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

  for (const district of districts) {
    statements.push(database.prepare(`INSERT OR IGNORE INTO districts (id, city_id, slug, name_ru, name_uz, name_en) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(district[0], 'city-samarkand', district[1], district[2], district[3], district[4]));
  }
  for (const organization of organizations) {
    statements.push(database.prepare(`INSERT OR IGNORE INTO organizations (id, slug, name, organization_type, verification_status, verified_at) VALUES (?, ?, ?, ?, 'verified', CURRENT_TIMESTAMP)`)
      .bind(organization[0], organization[1], organization[2], organization[3]));
    statements.push(database.prepare(`INSERT OR IGNORE INTO verification_cases (id, subject_type, subject_id, status, risk_level, reviewed_by, reviewed_at) VALUES (?, 'organization', ?, 'approved', 'low', 'system-seed', CURRENT_TIMESTAMP)`)
      .bind(`verification-${organization[0]}`, organization[0]));
  }
  for (const complex of complexSeeds) {
    statements.push(database.prepare(`INSERT OR IGNORE INTO complexes (
      id, slug, district_id, developer_org_id, name, address, description, completion_status,
      completion_label, verification_status, hero_image_url, featured, rating, map_x, map_y
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?, ?, ?, ?)`)
      .bind(complex.id, complex.slug, complex.districtId, complex.developerId, complex.name, complex.address, complex.description, complex.completionStatus, complex.completionLabel, complex.image, complex.featured, complex.rating, complex.mapX, complex.mapY));
    statements.push(database.prepare(`INSERT OR IGNORE INTO verification_cases (id, subject_type, subject_id, status, risk_level, reviewed_by, reviewed_at) VALUES (?, 'complex', ?, 'approved', 'low', 'system-seed', CURRENT_TIMESTAMP)`)
      .bind(`verification-${complex.id}`, complex.id));

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
  const [complexResult, listingResult] = await Promise.all([
    database.prepare(`SELECT
      c.id, c.slug, c.name, city.name_ru AS city, d.name_ru AS district, c.address,
      o.name AS developer, o.verification_status AS developer_verification,
      c.verification_status AS complex_verification, c.completion_status, c.completion_label,
      c.hero_image_url, c.featured, c.rating, c.map_x, c.map_y
      FROM complexes c
      JOIN districts d ON d.id = c.district_id
      JOIN cities city ON city.id = d.city_id
      JOIN organizations o ON o.id = c.developer_org_id
      ORDER BY c.featured DESC, c.rating DESC, c.name ASC`).all<ComplexRow>(),
    database.prepare(`SELECT
      l.id, l.complex_id, u.unit_number, u.rooms, u.area_sqm, u.floor_number,
      u.total_floors, u.finish, l.price_uzs, l.market_type, l.seller_type,
      l.reserve_enabled, l.published_at
      FROM listings l
      JOIN units u ON u.id = l.unit_id
      WHERE l.status = 'published' AND u.availability_status = 'available'
      ORDER BY l.published_at DESC`).all<ListingRow>(),
  ]);

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
      COALESCE(o.name, CASE WHEN l.seller_type = 'owner' THEN 'Проверенный собственник' ELSE 'Проверенный продавец' END) AS seller
      FROM listings l
      JOIN units u ON u.id = l.unit_id
      LEFT JOIN organizations o ON o.id = l.seller_org_id
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
  }));

  return {
    summary,
    description: record.description,
    gallery: (mediaResult.results ?? []).map((item) => item.url),
    listings: detailListings,
  };
}
