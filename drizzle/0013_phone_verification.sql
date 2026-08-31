CREATE TABLE IF NOT EXISTS buyer_phone_verifications (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  phone_e164 TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'blocked')),
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS phone_verification_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  phone_e164 TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_phone_challenges_user_created
  ON phone_verification_challenges(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_phone_challenges_expiry
  ON phone_verification_challenges(expires_at) WHERE consumed_at IS NULL;
