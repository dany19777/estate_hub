CREATE TABLE IF NOT EXISTS support_requests (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'ru' CHECK (locale IN ('ru', 'uz', 'en')),
  delivery_status TEXT NOT NULL DEFAULT 'queued' CHECK (delivery_status IN ('queued', 'sent', 'failed')),
  delivery_provider TEXT,
  delivery_reference TEXT,
  delivery_error TEXT,
  source_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_support_requests_status_created
  ON support_requests(delivery_status, created_at);

CREATE INDEX IF NOT EXISTS idx_support_requests_source_created
  ON support_requests(source_hash, created_at);
