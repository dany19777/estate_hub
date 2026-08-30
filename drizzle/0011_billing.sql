CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  inventory_limit INTEGER NOT NULL CHECK (inventory_limit > 0),
  monthly_price_uzs INTEGER NOT NULL DEFAULT 0 CHECK (monthly_price_uzs >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS developer_subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE REFERENCES organizations(id),
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled')),
  current_period_start TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_period_end TEXT NOT NULL,
  auto_renew INTEGER NOT NULL DEFAULT 1 CHECK (auto_renew IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_billing_config (
  id TEXT PRIMARY KEY,
  secondary_listing_fee_uzs INTEGER NOT NULL CHECK (secondary_listing_fee_uzs >= 0),
  secondary_period_days INTEGER NOT NULL DEFAULT 30 CHECK (secondary_period_days BETWEEN 1 AND 365),
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  listing_id TEXT REFERENCES listings(id),
  actor_user_id TEXT REFERENCES users(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('subscription_charge', 'plan_change', 'secondary_purchase', 'secondary_renewal')),
  amount_uzs INTEGER NOT NULL DEFAULT 0 CHECK (amount_uzs >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  provider TEXT NOT NULL,
  provider_reference TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS secondary_listing_purchases (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  purchaser_user_id TEXT NOT NULL REFERENCES users(id),
  billing_event_id TEXT NOT NULL UNIQUE REFERENCES billing_events(id),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  price_uzs INTEGER NOT NULL CHECK (price_uzs >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'refunded')),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_developer_subscriptions_status_end ON developer_subscriptions(status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_billing_events_org_created ON billing_events(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_billing_events_listing_created ON billing_events(listing_id, created_at);
CREATE INDEX IF NOT EXISTS idx_secondary_purchases_listing_end ON secondary_listing_purchases(listing_id, period_end);
CREATE INDEX IF NOT EXISTS idx_secondary_purchases_status_end ON secondary_listing_purchases(status, period_end);
