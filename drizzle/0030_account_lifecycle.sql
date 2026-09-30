CREATE TABLE IF NOT EXISTS account_consents (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  terms_accepted_at TEXT NOT NULL,
  privacy_accepted_at TEXT NOT NULL,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0 CHECK (marketing_opt_in IN (0, 1)),
  document_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'in_review', 'completed', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  UNIQUE(user_id, status)
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_status_created ON account_deletion_requests(status, created_at);
