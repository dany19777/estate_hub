CREATE TABLE IF NOT EXISTS reservation_outcomes (
  reservation_id TEXT PRIMARY KEY REFERENCES reservation_transactions(id),
  outcome_status TEXT NOT NULL DEFAULT 'active' CHECK (outcome_status IN ('active', 'visit_completed', 'deal_in_progress', 'buyer_refused', 'developer_refused', 'sold', 'cancelled_admin')),
  extension_reason TEXT,
  extended_by TEXT REFERENCES users(id),
  extended_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reservation_outcomes_status_updated ON reservation_outcomes(outcome_status, updated_at);
