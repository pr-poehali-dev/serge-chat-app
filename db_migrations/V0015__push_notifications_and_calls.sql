CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.app_settings (
  key VARCHAR(64) PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.users(id),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON t_p64541051_serge_chat_app.push_subscriptions(user_id);

ALTER TABLE t_p64541051_serge_chat_app.chat_members ADD COLUMN IF NOT EXISTS notify_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.calls (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.chats(id),
  caller_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.users(id),
  callee_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.users(id),
  is_video BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(16) NOT NULL DEFAULT 'ringing',
  offer TEXT,
  answer TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMP,
  ended_at TIMESTAMP,
  last_ping TIMESTAMP NOT NULL DEFAULT NOW(),
  end_reason VARCHAR(16)
);
CREATE INDEX IF NOT EXISTS idx_calls_callee_status ON t_p64541051_serge_chat_app.calls(callee_id, status);
CREATE INDEX IF NOT EXISTS idx_calls_caller_status ON t_p64541051_serge_chat_app.calls(caller_id, status);
