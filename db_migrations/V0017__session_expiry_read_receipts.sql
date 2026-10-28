ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMP;
UPDATE t_p64541051_serge_chat_app.users
SET session_expires_at = NOW() + INTERVAL '6 months'
WHERE session_id IS NOT NULL AND session_expires_at IS NULL;

CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.push_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.users(id),
  token TEXT NOT NULL UNIQUE,
  platform VARCHAR(16) NOT NULL DEFAULT 'android',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON t_p64541051_serge_chat_app.push_tokens(user_id);

CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.group_calls (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.chats(id),
  started_by INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.users(id),
  is_video BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_group_calls_chat_status ON t_p64541051_serge_chat_app.group_calls(chat_id, status);

CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.group_call_members (
  call_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.group_calls(id),
  user_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.users(id),
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_ping TIMESTAMP NOT NULL DEFAULT NOW(),
  left_at TIMESTAMP,
  PRIMARY KEY (call_id, user_id)
);

CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.group_call_signals (
  id SERIAL PRIMARY KEY,
  call_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.group_calls(id),
  from_user INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.users(id),
  to_user INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.users(id),
  kind VARCHAR(16) NOT NULL,
  payload TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  delivered BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_group_call_signals_to ON t_p64541051_serge_chat_app.group_call_signals(call_id, to_user, delivered);
