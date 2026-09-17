-- Password reset tokens, avatar image URL, and helper index for group member management

ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64);
ALTER TABLE t_p64541051_serge_chat_app.users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_reset_token ON t_p64541051_serge_chat_app.users(reset_token);
