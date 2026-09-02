CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  complex_id TEXT NOT NULL REFERENCES complexes(id),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'published', 'rejected', 'hidden')),
  trust_level TEXT NOT NULL DEFAULT 'standard' CHECK (trust_level IN ('standard', 'verified_resident')),
  moderation_reason TEXT,
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, complex_id)
);

CREATE TABLE IF NOT EXISTS review_ratings (
  review_id TEXT NOT NULL REFERENCES reviews(id),
  category TEXT NOT NULL CHECK (category IN ('construction_quality', 'location', 'infrastructure', 'yard', 'sound_insulation', 'management_service')),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  PRIMARY KEY(review_id, category)
);

CREATE TABLE IF NOT EXISTS review_responses (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL UNIQUE REFERENCES reviews(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  responder_user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_reports (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id),
  reporter_user_id TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'dismissed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(review_id, reporter_user_id)
);

CREATE TABLE IF NOT EXISTS review_moderation_events (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id),
  decision TEXT NOT NULL CHECK (decision IN ('published', 'rejected', 'hidden', 'restored')),
  reason TEXT,
  reviewed_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_complex_status_updated ON reviews(complex_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_reviews_status_updated ON reviews(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_review_reports_status_created ON review_reports(status, created_at);
CREATE INDEX IF NOT EXISTS idx_review_moderation_review_created ON review_moderation_events(review_id, created_at);
