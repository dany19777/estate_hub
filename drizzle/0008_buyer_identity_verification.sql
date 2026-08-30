CREATE TABLE IF NOT EXISTS buyer_identity_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  provider TEXT NOT NULL,
  provider_reference TEXT NOT NULL UNIQUE,
  document_type TEXT NOT NULL CHECK (document_type IN ('passport', 'id_card')),
  document_last4 TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'verified', 'rejected')),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  rejection_reason TEXT,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_buyer_identity_status_submitted ON buyer_identity_verifications(status, submitted_at);
