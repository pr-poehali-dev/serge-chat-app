ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_from INTEGER NOT NULL DEFAULT 1380;
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_to INTEGER NOT NULL DEFAULT 480;
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_tz INTEGER NOT NULL DEFAULT 180;

CREATE TABLE IF NOT EXISTS hidden_messages (
  user_id INTEGER NOT NULL REFERENCES users(id),
  message_id INTEGER NOT NULL REFERENCES messages(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_hidden_messages_message ON hidden_messages(message_id);

CREATE TABLE IF NOT EXISTS scheduled_messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES chats(id),
  topic_id INTEGER REFERENCES chat_topics(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  send_at TIMESTAMP NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'pending',
  message_id INTEGER REFERENCES messages(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_due ON scheduled_messages(status, send_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_sender ON scheduled_messages(sender_id, chat_id, status);

CREATE TABLE IF NOT EXISTS sticker_packs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sticker_packs_user ON sticker_packs(user_id);

CREATE TABLE IF NOT EXISTS custom_stickers (
  id SERIAL PRIMARY KEY,
  pack_id INTEGER NOT NULL REFERENCES sticker_packs(id),
  url TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_custom_stickers_pack ON custom_stickers(pack_id);

ALTER TABLE polls ADD COLUMN IF NOT EXISTS share_code VARCHAR(24);
CREATE UNIQUE INDEX IF NOT EXISTS idx_polls_share_code ON polls(share_code) WHERE share_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS poll_shares (
  message_id INTEGER PRIMARY KEY REFERENCES messages(id),
  poll_id INTEGER NOT NULL REFERENCES polls(id),
  chat_id INTEGER NOT NULL REFERENCES chats(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_poll_shares_poll ON poll_shares(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_shares_chat ON poll_shares(chat_id);
