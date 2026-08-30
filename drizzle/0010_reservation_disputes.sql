CREATE TABLE IF NOT EXISTS reservation_disputes (
  id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL REFERENCES reservation_transactions(id),
  opened_by_user_id TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL CHECK (category IN ('unit_unavailable', 'terms_not_honored', 'developer_cancelled', 'payment_issue', 'other')),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 20 AND 1000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved_refund', 'resolved_no_refund', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
  assigned_to TEXT REFERENCES users(id),
  resolution_note TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservation_disputes_one_active
  ON reservation_disputes(reservation_id) WHERE status IN ('open', 'in_review');
CREATE INDEX IF NOT EXISTS idx_reservation_disputes_status_created
  ON reservation_disputes(status, created_at);
CREATE INDEX IF NOT EXISTS idx_reservation_disputes_buyer_created
  ON reservation_disputes(opened_by_user_id, created_at);
