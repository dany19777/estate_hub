ALTER TABLE support_requests ADD COLUMN idempotency_key TEXT;
ALTER TABLE support_requests ADD COLUMN request_hash TEXT;
CREATE UNIQUE INDEX idx_support_requests_idempotency ON support_requests(idempotency_key) WHERE idempotency_key IS NOT NULL;
