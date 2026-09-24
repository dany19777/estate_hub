CREATE TABLE IF NOT EXISTS platform_mfa_recovery_codes (
  user_id TEXT NOT NULL REFERENCES users(id),
  code_hash TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, code_hash)
);

CREATE INDEX IF NOT EXISTS idx_platform_mfa_recovery_unused
  ON platform_mfa_recovery_codes (user_id, used_at);
