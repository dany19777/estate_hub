ALTER TABLE conversation_messages ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX idx_conversation_messages_idempotency ON conversation_messages(idempotency_key) WHERE idempotency_key IS NOT NULL;
