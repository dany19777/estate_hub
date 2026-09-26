CREATE TABLE IF NOT EXISTS support_request_handling (
  request_id TEXT PRIMARY KEY REFERENCES support_requests(id),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'answered', 'closed')),
  handled_by TEXT NOT NULL REFERENCES users(id),
  internal_note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_support_handling_status_updated ON support_request_handling(status, updated_at);
