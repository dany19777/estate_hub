CREATE TABLE IF NOT EXISTS complex_features (
  id TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL REFERENCES complexes(id),
  category TEXT NOT NULL CHECK (category IN ('infrastructure', 'amenity')),
  name TEXT NOT NULL,
  detail TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(complex_id, category, name)
);

CREATE INDEX IF NOT EXISTS idx_complex_features_complex_category
  ON complex_features(complex_id, category, sort_order);

PRAGMA optimize;
