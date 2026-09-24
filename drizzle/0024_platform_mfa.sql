ALTER TABLE auth_sessions ADD COLUMN mfa_verified_at INTEGER;

CREATE TABLE IF NOT EXISTS platform_mfa_credentials (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  encrypted_secret TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active')),
  last_used_step INTEGER NOT NULL DEFAULT -1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
