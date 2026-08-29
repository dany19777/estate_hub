CREATE TABLE IF NOT EXISTS buyer_favorites (
  user_id TEXT NOT NULL REFERENCES users(id),
  complex_id TEXT NOT NULL REFERENCES complexes(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, complex_id)
);
CREATE TABLE IF NOT EXISTS buyer_saved_searches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  filters_json TEXT NOT NULL,
  notifications_enabled INTEGER NOT NULL DEFAULT 1 CHECK (notifications_enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_buyer_favorites_created ON buyer_favorites(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_buyer_saved_searches_updated ON buyer_saved_searches(user_id, updated_at);
