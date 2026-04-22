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