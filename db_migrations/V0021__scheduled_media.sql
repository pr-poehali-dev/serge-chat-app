ALTER TABLE scheduled_messages ADD COLUMN IF NOT EXISTS kind VARCHAR(12) NOT NULL DEFAULT 'text';
ALTER TABLE scheduled_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE scheduled_messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE scheduled_messages ADD COLUMN IF NOT EXISTS file_size INTEGER;
