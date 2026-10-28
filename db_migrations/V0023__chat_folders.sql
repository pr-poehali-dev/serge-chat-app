CREATE TABLE IF NOT EXISTS chat_folders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(40) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_folders_user ON chat_folders(user_id);

ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS folder_id INTEGER;
