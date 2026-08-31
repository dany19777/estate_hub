CREATE TABLE IF NOT EXISTS secondary_listing_owners (
  listing_id TEXT PRIMARY KEY REFERENCES listings(id),
  seller_user_id TEXT NOT NULL REFERENCES users(id),
  contact_phone TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('ownership_certificate', 'power_of_attorney')),
  document_reference TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'submitted' CHECK (verification_status IN ('submitted', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_secondary_owners_user_updated
  ON secondary_listing_owners(seller_user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_secondary_owners_verification
  ON secondary_listing_owners(verification_status, updated_at);
