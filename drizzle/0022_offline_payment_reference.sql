CREATE UNIQUE INDEX IF NOT EXISTS idx_offline_payment_reference
  ON billing_events(provider, provider_reference)
  WHERE provider IN ('offline_bank_transfer', 'offline_card_transfer');
