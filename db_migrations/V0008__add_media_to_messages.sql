ALTER TABLE t_p64541051_serge_chat_app.messages ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NOT NULL DEFAULT 'text';
ALTER TABLE t_p64541051_serge_chat_app.messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE t_p64541051_serge_chat_app.messages ADD COLUMN IF NOT EXISTS duration_sec INTEGER;
ALTER TABLE t_p64541051_serge_chat_app.messages ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE t_p64541051_serge_chat_app.messages ALTER COLUMN text SET DEFAULT '';