CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  buyer_user_id TEXT NOT NULL REFERENCES users(id),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  complex_id TEXT NOT NULL REFERENCES complexes(id),
  organization_id TEXT REFERENCES organizations(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(buyer_user_id, listing_id)
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  author_type TEXT NOT NULL CHECK (author_type IN ('buyer', 'seller', 'system')),
  author_user_id TEXT REFERENCES users(id),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  read_by_buyer_at TEXT,
  read_by_seller_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer_updated ON conversations(buyer_user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_conversations_organization_updated ON conversations(organization_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created ON conversation_messages(conversation_id, created_at);
