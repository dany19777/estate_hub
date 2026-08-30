CREATE TABLE IF NOT EXISTS promotion_products (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('complex', 'listing')),
  surface TEXT NOT NULL CHECK (surface IN ('search', 'homepage', 'search_homepage', 'special')),
  duration_days INTEGER NOT NULL CHECK (duration_days BETWEEN 1 AND 365),
  price_uzs INTEGER NOT NULL DEFAULT 0 CHECK (price_uzs >= 0),
  boost_weight INTEGER NOT NULL DEFAULT 0 CHECK (boost_weight BETWEEN 0 AND 1000),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES promotion_products(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  complex_id TEXT REFERENCES complexes(id),
  listing_id TEXT REFERENCES listings(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('scheduled', 'active', 'expired', 'cancelled')),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  amount_uzs INTEGER NOT NULL DEFAULT 0 CHECK (amount_uzs >= 0),
  provider TEXT NOT NULL,
  provider_reference TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  sponsored_label TEXT NOT NULL DEFAULT 'Реклама',
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((complex_id IS NOT NULL AND listing_id IS NULL) OR (complex_id IS NULL AND listing_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_promotions_status_end ON promotions(status, ends_at);
CREATE INDEX IF NOT EXISTS idx_promotions_org_created ON promotions(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_promotions_complex_status_end ON promotions(complex_id, status, ends_at);
CREATE INDEX IF NOT EXISTS idx_promotions_listing_status_end ON promotions(listing_id, status, ends_at);
