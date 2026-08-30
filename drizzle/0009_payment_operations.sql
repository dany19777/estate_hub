CREATE TABLE IF NOT EXISTS payment_operations (
  id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL REFERENCES reservation_transactions(id),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('reservation_payment', 'refund', 'reconciliation')),
  provider TEXT NOT NULL,
  provider_reference TEXT NOT NULL,
  amount_uzs INTEGER NOT NULL CHECK (amount_uzs > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'manual_review')),
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_reference, operation_type)
);

CREATE INDEX IF NOT EXISTS idx_payment_operations_reservation_created
  ON payment_operations(reservation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_operations_status_created
  ON payment_operations(status, created_at);
