ALTER TABLE t_p64541051_serge_chat_app.messages ADD COLUMN IF NOT EXISTS reply_to_id INTEGER REFERENCES t_p64541051_serge_chat_app.messages(id);
ALTER TABLE t_p64541051_serge_chat_app.messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;
ALTER TABLE t_p64541051_serge_chat_app.messages ADD COLUMN IF NOT EXISTS removed_at TIMESTAMP;
ALTER TABLE t_p64541051_serge_chat_app.messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE t_p64541051_serge_chat_app.messages ADD COLUMN IF NOT EXISTS file_size INTEGER;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON t_p64541051_serge_chat_app.messages(reply_to_id);