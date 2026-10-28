-- Recreate core tables (schema was empty) + add auth/profile fields + per-user chat pinning

CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_initials VARCHAR(4) NOT NULL,
  avatar_color VARCHAR(20) DEFAULT '#a855f7',
  is_online BOOLEAN DEFAULT false,
  session_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

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

-- Auth & profile fields for email/password registration
ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS password_salt VARCHAR(64);
ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS login VARCHAR(50) UNIQUE;
ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Per-user chat pinning
ALTER TABLE t_p64541051_serge_chat_app.chat_members ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
