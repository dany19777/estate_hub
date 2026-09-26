CREATE TABLE IF NOT EXISTS lead_assignments (
  lead_id TEXT PRIMARY KEY REFERENCES leads(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  assigned_by TEXT NOT NULL REFERENCES users(id),
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_organization_user ON lead_assignments(organization_id, user_id);
