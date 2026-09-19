CREATE TABLE IF NOT EXISTS buyer_recent_views (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('complex', 'listing')),
  target_id TEXT NOT NULL,
  viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_buyer_recent_views_user_viewed
  ON buyer_recent_views(user_id, viewed_at DESC);

PRAGMA optimize;
