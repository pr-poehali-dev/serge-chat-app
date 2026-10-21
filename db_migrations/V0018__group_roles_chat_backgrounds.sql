ALTER TABLE t_p64541051_serge_chat_app.chats ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE t_p64541051_serge_chat_app.chats ADD COLUMN IF NOT EXISTS description VARCHAR(300);
ALTER TABLE t_p64541051_serge_chat_app.chats ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES t_p64541051_serge_chat_app.users(id);

ALTER TABLE t_p64541051_serge_chat_app.chat_members ADD COLUMN IF NOT EXISTS role VARCHAR(16) NOT NULL DEFAULT 'member';
ALTER TABLE t_p64541051_serge_chat_app.chat_members ADD COLUMN IF NOT EXISTS chat_bg TEXT;

UPDATE t_p64541051_serge_chat_app.chat_members cm
SET role = 'owner'
FROM (
  SELECT DISTINCT ON (m.chat_id) m.id AS member_row
  FROM t_p64541051_serge_chat_app.chat_members m
  JOIN t_p64541051_serge_chat_app.chats c ON c.id = m.chat_id AND c.is_group = true
  WHERE NOT EXISTS (
    SELECT 1 FROM t_p64541051_serge_chat_app.chat_members o WHERE o.chat_id = m.chat_id AND o.role = 'owner'
  )
  ORDER BY m.chat_id, m.joined_at ASC NULLS LAST, m.id ASC
) first_member
WHERE cm.id = first_member.member_row;

UPDATE t_p64541051_serge_chat_app.chats c
SET created_by = cm.user_id
FROM t_p64541051_serge_chat_app.chat_members cm
WHERE cm.chat_id = c.id AND cm.role = 'owner' AND c.is_group = true AND c.created_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_members_chat_role ON t_p64541051_serge_chat_app.chat_members(chat_id, role);
