ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP;
ALTER TABLE t_p64541051_serge_chat_app.chat_members ADD COLUMN IF NOT EXISTS typing_until TIMESTAMP;
ALTER TABLE t_p64541051_serge_chat_app.chat_members ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.chat_topics (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.chats(id),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(16) NOT NULL DEFAULT '#a855f7',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_by INTEGER REFERENCES t_p64541051_serge_chat_app.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_topics_chat_id ON t_p64541051_serge_chat_app.chat_topics(chat_id);

ALTER TABLE t_p64541051_serge_chat_app.messages ADD COLUMN IF NOT EXISTS topic_id INTEGER REFERENCES t_p64541051_serge_chat_app.chat_topics(id);
CREATE INDEX IF NOT EXISTS idx_messages_topic_id ON t_p64541051_serge_chat_app.messages(topic_id);