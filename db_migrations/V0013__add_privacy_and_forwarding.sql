ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS hide_last_seen BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS hide_typing BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE t_p64541051_serge_chat_app.messages ADD COLUMN IF NOT EXISTS forwarded_from TEXT;