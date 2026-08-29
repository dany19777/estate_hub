export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS regions (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name_ru TEXT NOT NULL,
    name_uz TEXT NOT NULL,
    name_en TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS cities (
    id TEXT PRIMARY KEY,
    region_id TEXT NOT NULL REFERENCES regions(id),
    slug TEXT NOT NULL UNIQUE,
    name_ru TEXT NOT NULL,
    name_uz TEXT NOT NULL,
    name_en TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS districts (
    id TEXT PRIMARY KEY,
    city_id TEXT NOT NULL REFERENCES cities(id),
    slug TEXT NOT NULL,
    name_ru TEXT NOT NULL,
    name_uz TEXT NOT NULL,
    name_en TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(city_id, slug)
  )`,
  `CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    organization_type TEXT NOT NULL CHECK (organization_type IN ('developer', 'agency')),
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
    verified_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS verification_cases (
    id TEXT PRIMARY KEY,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('organization', 'owner', 'listing', 'complex')),
    subject_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'suspended')),
    risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS complexes (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    district_id TEXT NOT NULL REFERENCES districts(id),
    developer_org_id TEXT NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    description TEXT NOT NULL,
    completion_status TEXT NOT NULL CHECK (completion_status IN ('completed', 'under_construction')),
    completion_label TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
    hero_image_url TEXT NOT NULL,
    featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
    rating REAL NOT NULL DEFAULT 0,
    map_x REAL NOT NULL,
    map_y REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY,
    complex_id TEXT NOT NULL REFERENCES complexes(id),
    name TEXT NOT NULL,
    total_floors INTEGER NOT NULL CHECK (total_floors > 0),
    completion_status TEXT NOT NULL CHECK (completion_status IN ('completed', 'under_construction')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(complex_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL REFERENCES buildings(id),
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(building_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS floors (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL REFERENCES sections(id),
    floor_number INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(section_id, floor_number)
  )`,
  `CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    complex_id TEXT NOT NULL REFERENCES complexes(id),
    building_id TEXT NOT NULL REFERENCES buildings(id),
    section_id TEXT NOT NULL REFERENCES sections(id),
    floor_id TEXT NOT NULL REFERENCES floors(id),
    unit_number TEXT NOT NULL,
    rooms INTEGER NOT NULL CHECK (rooms BETWEEN 1 AND 10),
    area_sqm REAL NOT NULL CHECK (area_sqm > 0),
    floor_number INTEGER NOT NULL,
    total_floors INTEGER NOT NULL,
    finish TEXT NOT NULL,
    availability_status TEXT NOT NULL CHECK (availability_status IN ('available', 'held', 'reserved', 'sold', 'unavailable')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(building_id, unit_number)
  )`,
  `CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL REFERENCES units(id),
    complex_id TEXT NOT NULL REFERENCES complexes(id),
    seller_org_id TEXT REFERENCES organizations(id),
    market_type TEXT NOT NULL CHECK (market_type IN ('PRIMARY_DEVELOPER', 'SECONDARY_OWNER', 'SECONDARY_AGENCY')),
    seller_type TEXT NOT NULL CHECK (seller_type IN ('developer', 'owner', 'agency')),
    price_uzs INTEGER NOT NULL CHECK (price_uzs > 0),
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending_verification', 'pending_moderation', 'published', 'paused', 'reserved', 'sold', 'rejected', 'expired')),
    reserve_enabled INTEGER NOT NULL DEFAULT 0 CHECK (reserve_enabled IN (0, 1)),
    published_at TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS listing_price_history (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES listings(id),
    old_price_uzs INTEGER,
    new_price_uzs INTEGER NOT NULL CHECK (new_price_uzs > 0),
    reason TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('organization', 'complex', 'unit', 'listing')),
    entity_id TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'floor_plan', 'document')),
    url TEXT NOT NULL,
    alt_text TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    actor_type TEXT NOT NULL,
    actor_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
] as const;

export const indexStatements = [
  `CREATE INDEX IF NOT EXISTS idx_districts_city_id ON districts(city_id)`,
  `CREATE INDEX IF NOT EXISTS idx_complexes_district_status ON complexes(district_id, completion_status)`,
  `CREATE INDEX IF NOT EXISTS idx_complexes_developer_org_id ON complexes(developer_org_id)`,
  `CREATE INDEX IF NOT EXISTS idx_units_complex_availability ON units(complex_id, availability_status)`,
  `CREATE INDEX IF NOT EXISTS idx_listings_complex_status ON listings(complex_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_listings_market_price ON listings(market_type, price_uzs) WHERE status = 'published'`,
  `CREATE INDEX IF NOT EXISTS idx_price_history_listing_changed ON listing_price_history(listing_id, changed_at)`,
  `CREATE INDEX IF NOT EXISTS idx_media_entity_sort ON media_assets(entity_type, entity_id, sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_verification_subject ON verification_cases(subject_type, subject_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_entity_created ON audit_events(entity_type, entity_id, created_at)`,
] as const;
