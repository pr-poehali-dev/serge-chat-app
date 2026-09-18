-- Emoji reactions on messages
CREATE TABLE IF NOT EXISTS t_p64541051_serge_chat_app.message_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.messages(id),
  user_id INTEGER NOT NULL REFERENCES t_p64541051_serge_chat_app.users(id),
  emoji VARCHAR(8) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON t_p64541051_serge_chat_app.message_reactions(message_id);
