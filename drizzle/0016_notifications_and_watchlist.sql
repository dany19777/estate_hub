CREATE TABLE IF NOT EXISTS buyer_watch_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('complex', 'listing', 'saved_search')),
  target_id TEXT NOT NULL,
  notify_price_reduction INTEGER NOT NULL DEFAULT 1 CHECK (notify_price_reduction IN (0, 1)),
  notify_availability INTEGER NOT NULL DEFAULT 1 CHECK (notify_availability IN (0, 1)),
  notify_special_offer INTEGER NOT NULL DEFAULT 1 CHECK (notify_special_offer IN (0, 1)),
  notify_new_inventory INTEGER NOT NULL DEFAULT 1 CHECK (notify_new_inventory IN (0, 1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  email_enabled INTEGER NOT NULL DEFAULT 1 CHECK (email_enabled IN (0, 1)),
  sms_critical_enabled INTEGER NOT NULL DEFAULT 1 CHECK (sms_critical_enabled IN (0, 1)),
  marketing_consent INTEGER NOT NULL DEFAULT 0 CHECK (marketing_consent IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  entity_type TEXT,
  entity_id TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'critical')),
  dedupe_key TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, dedupe_key)
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL REFERENCES notifications(id),
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'push')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'skipped')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  delivered_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(notification_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_watch_user_active_updated ON buyer_watch_subscriptions(user_id, active, updated_at);
CREATE INDEX IF NOT EXISTS idx_watch_target_active ON buyer_watch_subscriptions(target_type, target_id, active);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read_at, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity_created ON notifications(entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status_created ON notification_deliveries(status, created_at);

PRAGMA optimize;
