CREATE TABLE IF NOT EXISTS developer_subscription_activations (
  billing_event_id TEXT PRIMARY KEY REFERENCES billing_events(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  confirmed_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
