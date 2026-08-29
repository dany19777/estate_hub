CREATE TABLE IF NOT EXISTS buyer_comparisons (
  user_id TEXT NOT NULL REFERENCES users(id),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_buyer_comparisons_created ON buyer_comparisons(user_id, created_at);
