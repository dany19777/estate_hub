CREATE TABLE IF NOT EXISTS reservation_transactions (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  unit_id TEXT NOT NULL REFERENCES units(id),
  complex_id TEXT NOT NULL REFERENCES complexes(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  buyer_user_id TEXT NOT NULL REFERENCES users(id),
  customer_id TEXT NOT NULL REFERENCES crm_customers(id),
  lead_id TEXT NOT NULL UNIQUE REFERENCES leads(id),
  idempotency_key TEXT NOT NULL UNIQUE,
  price_uzs INTEGER NOT NULL CHECK (price_uzs > 0),
  reservation_fee_uzs INTEGER NOT NULL CHECK (reservation_fee_uzs > 0),
  status TEXT NOT NULL CHECK (status IN ('payment_hold', 'confirmed', 'cancelled', 'expired', 'refunded')),
  payment_status TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK (payment_status IN ('awaiting_payment', 'paid', 'refunded', 'failed')),
  hold_expires_at TEXT NOT NULL,
  reservation_expires_at TEXT,
  payment_reference TEXT UNIQUE,
  cancellation_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_one_active_listing ON reservation_transactions(listing_id) WHERE status IN ('payment_hold', 'confirmed');
CREATE INDEX IF NOT EXISTS idx_reservations_buyer_status ON reservation_transactions(buyer_user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_reservations_hold_expiry ON reservation_transactions(status, hold_expires_at);
