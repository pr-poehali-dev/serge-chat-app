CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.chats (
  id SERIAL PRIMARY KEY,
  is_group BOOLEAN DEFAULT false,
  name VARCHAR(100),
  avatar_color VARCHAR(20) DEFAULT '#a855f7',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.chat_members (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES t_p64541051_serge_chat_app.chats(id),
  user_id INTEGER REFERENCES t_p64541051_serge_chat_app.users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES t_p64541051_serge_chat_app.chats(id),
  sender_id INTEGER REFERENCES t_p64541051_serge_chat_app.users(id),
  text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON t_p64541051_serge_chat_app.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON t_p64541051_serge_chat_app.messages(created_at);