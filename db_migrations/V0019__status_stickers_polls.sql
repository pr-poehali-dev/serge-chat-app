ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS mood_emoji VARCHAR(16);
ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS mood_text VARCHAR(80);
ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS bio VARCHAR(200);

CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.favorite_stickers (
  user_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.users(id),
  sticker VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, sticker)
);

CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.polls (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.chats(id),
  message_id INTEGER NOT NULL UNIQUE REFERENCES t_p64541051_serge_chat_app.messages(id),
  question VARCHAR(300) NOT NULL,
  multiple BOOLEAN NOT NULL DEFAULT false,
  closed BOOLEAN NOT NULL DEFAULT false,
  created_by INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_polls_chat ON t_p64541051_serge_chat_app.polls(chat_id);

CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.poll_options (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.polls(id),
  text VARCHAR(120) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON t_p64541051_serge_chat_app.poll_options(poll_id);

CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.poll_votes (
  poll_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.polls(id),
  option_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.poll_options(id),
  user_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (option_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_user ON t_p64541051_serge_chat_app.poll_votes(poll_id, user_id);
