"""Чаты, группы, темы, сообщения, присутствие и индикатор набора для мессенджера Трынделка"""
import base64
import json
import os
import re
import uuid

import psycopg2

SCHEMA = "t_p64541051_serge_chat_app"
DEFAULT_USER_ID = 1  # Гостевой демо-пользователь, если сессия не передана
ONLINE_WINDOW_SEC = 30
TYPING_TTL_SEC = 6
GROUP_COLORS = ["#a855f7", "#ec4899", "#38bdf8", "#34d399", "#f59e0b", "#6366f1"]

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}


MAX_AVATAR_BYTES = 3 * 1024 * 1024
MAX_BG_BYTES = 5 * 1024 * 1024
BG_RE = re.compile(r"^(preset:[a-z0-9-]{1,32}|color:#[0-9a-fA-F]{6}|img:(https?://|/files/)[^\s]{1,500})$")
IMAGE_TYPES = {"image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp"}


def save_file(key: str, data: bytes, content_type: str) -> str:
    local_dir = os.environ.get("LOCAL_STORAGE_DIR")
    if local_dir:
        path = os.path.join(local_dir, key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)
        return f"{os.environ.get('PUBLIC_FILES_URL', '/files').rstrip('/')}/{key}"
    import boto3
    s3 = boto3.client(
        "s3",
        endpoint_url=os.environ.get("S3_ENDPOINT", "https://bucket.poehali.dev"),
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket=os.environ.get("S3_BUCKET", "files"), Key=key, Body=data, ContentType=content_type)
    public_base = os.environ.get("PUBLIC_FILES_URL") or f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket"
    return f"{public_base.rstrip('/')}/{key}"


def decode_image(body: dict, limit: int):
    raw = body.get("imageBase64") or ""
    ctype = (body.get("contentType") or "image/jpeg").lower()
    if ctype not in IMAGE_TYPES:
        raise ValueError("Поддерживаются JPG, PNG и WebP")
    if "," in raw:
        raw = raw.split(",", 1)[1]
    try:
        data = base64.b64decode(raw, validate=False)
    except Exception:
        raise ValueError("Не удалось прочитать изображение")
    if not data:
        raise ValueError("Пустое изображение")
    if len(data) > limit:
        raise ValueError("Изображение слишком большое")
    return data, ctype, IMAGE_TYPES[ctype]


def get_role(cur, chat_id: int, user_id: int):
    cur.execute(f"SELECT role FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s", (chat_id, user_id))
    row = cur.fetchone()
    return row[0] if row else None


def is_group_chat(cur, chat_id) -> bool:
    cur.execute(f"SELECT is_group FROM {SCHEMA}.chats WHERE id = %s", (chat_id,))
    row = cur.fetchone()
    return bool(row and row[0])


def promote_successor(cur, chat_id: int, leaving_user: int) -> None:
    """Если уходит владелец, права переходят старшему администратору, а затем старейшему участнику"""
    cur.execute(f"""
        SELECT user_id FROM {SCHEMA}.chat_members
        WHERE chat_id = %s AND user_id != %s
        ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, joined_at ASC NULLS LAST, id ASC
        LIMIT 1
    """, (chat_id, leaving_user))
    row = cur.fetchone()
    if row:
        cur.execute(f"UPDATE {SCHEMA}.chat_members SET role = 'owner' WHERE chat_id = %s AND user_id = %s", (chat_id, row[0]))


def reply(status: int, payload: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(payload)}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def resolve_user(cur, headers: dict):
    session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
    if not session_id:
        return DEFAULT_USER_ID, False
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE session_id = %s AND (session_expires_at IS NULL OR session_expires_at > NOW())", (session_id,))
    row = cur.fetchone()
    if row:
        return row[0], True
    return DEFAULT_USER_ID, False


def is_member(cur, chat_id: int, user_id: int) -> bool:
    cur.execute(
        f"SELECT 1 FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s",
        (chat_id, user_id),
    )
    return cur.fetchone() is not None


def status_text(seen_ago) -> str:
    if seen_ago is None:
        return "был(а) недавно"
    s = float(seen_ago)
    if s < ONLINE_WINDOW_SEC:
        return "в сети"
    if s < 3600:
        return f"был(а) {max(1, int(s // 60))} мин назад"
    if s < 86400:
        return f"был(а) {int(s // 3600)} ч назад"
    return "был(а) давно"


def is_online(seen_ago) -> bool:
    return seen_ago is not None and float(seen_ago) < ONLINE_WINDOW_SEC


def read_settings(cur, user_id: int) -> dict:
    cur.execute(
        f"SELECT show_online, show_typing, read_receipts, who_can_message FROM {SCHEMA}.users WHERE id = %s",
        (user_id,),
    )
    row = cur.fetchone()
    if not row:
        return {"showOnline": True, "showTyping": True, "readReceipts": True, "whoCanMessage": "all"}
    return {"showOnline": row[0], "showTyping": row[1], "readReceipts": row[2], "whoCanMessage": row[3]}


def handler(event: dict, context) -> dict:
    """Чаты и сообщения, создание групп и тем, присутствие пользователей и индикатор набора текста"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    headers = event.get("headers") or {}
    action = params.get("action")
    body = json.loads(event.get("body") or "{}") if method == "POST" else {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        my_user_id, authed = resolve_user(cur, headers)
        if not authed and (headers.get("X-Session-Id") or headers.get("x-session-id")):
            return reply(401, {"error": "Сессия истекла, войдите заново", "code": "session_expired"})

        if authed:
            cur.execute(f"""
                UPDATE {SCHEMA}.users SET last_seen = NOW(), is_online = true
                WHERE id = %s AND (last_seen IS NULL OR last_seen < NOW() - INTERVAL '10 seconds')
            """, (my_user_id,))
            conn.commit()

        # GET /chats?action=messages&chat_id=X[&topic_id=Y] — сообщения чата или темы
        if method == "GET" and action == "messages":
            chat_id = int(params["chat_id"])
            topic_id = int(params["topic_id"]) if params.get("topic_id") else None
            if not is_member(cur, chat_id, my_user_id):
                return reply(403, {"error": "Нет доступа к чату"})
            cur.execute(f"SELECT read_receipts FROM {SCHEMA}.users WHERE id = %s", (my_user_id,))
            receipts_row = cur.fetchone()
            if not receipts_row or receipts_row[0]:
                cur.execute(f"""
                    UPDATE {SCHEMA}.messages SET is_read = true
                    WHERE chat_id = %s AND sender_id != %s AND is_read = false
                      AND topic_id IS NOT DISTINCT FROM %s
                """, (chat_id, my_user_id, topic_id))
            cur.execute(f"""
                UPDATE {SCHEMA}.chat_members SET last_read_at = NOW()
                WHERE chat_id = %s AND user_id = %s
            """, (chat_id, my_user_id))
            conn.commit()
            cur.execute(f"""
                SELECT m.id, m.text, m.sender_id, m.is_read,
                       TO_CHAR(m.created_at, 'HH24:MI') as time_str,
                       m.created_at, m.kind, m.media_url, m.duration_sec, m.transcript,
                       u.display_name, u.avatar_color, u.avatar_initials, u.avatar_url,
                       m.file_name, m.file_size, m.edited_at, m.removed_at,
                       rm.id, rm.text, rm.kind, rm.file_name, rm.removed_at, ru.display_name,
                       m.forwarded_from
                FROM {SCHEMA}.messages m
                LEFT JOIN {SCHEMA}.users u ON u.id = m.sender_id
                LEFT JOIN {SCHEMA}.messages rm ON rm.id = m.reply_to_id
                LEFT JOIN {SCHEMA}.users ru ON ru.id = rm.sender_id
                WHERE m.chat_id = %s AND m.topic_id IS NOT DISTINCT FROM %s
                ORDER BY m.created_at ASC
            """, (chat_id, topic_id))
            rows = cur.fetchall()
            message_ids = [r[0] for r in rows]
            reactions_by_msg: dict = {}
            if message_ids:
                cur.execute(f"""
                    SELECT message_id, emoji, user_id
                    FROM {SCHEMA}.message_reactions
                    WHERE message_id = ANY(%s)
                """, (message_ids,))
                for msg_id, emoji, user_id in cur.fetchall():
                    reactions_by_msg.setdefault(msg_id, {}).setdefault(emoji, []).append(user_id)
            cur.execute(f"""
                SELECT BOOL_AND(u.read_receipts) FROM {SCHEMA}.chat_members cm
                JOIN {SCHEMA}.users u ON u.id = cm.user_id
                WHERE cm.chat_id = %s AND cm.user_id != %s
            """, (chat_id, my_user_id))
            rr = cur.fetchone()
            other_receipts = True if not rr or rr[0] is None else bool(rr[0])
            cur.execute(f"""
                SELECT cm.last_read_at, u.last_seen, u.read_receipts
                FROM {SCHEMA}.chat_members cm
                JOIN {SCHEMA}.users u ON u.id = cm.user_id
                WHERE cm.chat_id = %s AND cm.user_id != %s
            """, (chat_id, my_user_id))
            others = cur.fetchall()
            counted = [o for o in others if o[2]]
            chat_is_group = len(others) > 1
            messages = []
            for r in rows:
                removed = r[17] is not None
                created = r[5]
                is_mine = r[2] == my_user_id
                read_count = 0
                delivered = False
                if is_mine and not removed:
                    read_count = sum(1 for o in counted if o[0] is not None and o[0] >= created)
                    delivered = any(o[1] is not None and o[1] >= created for o in others) or bool(r[3]) or read_count > 0
                is_read = bool(r[3]) and (not is_mine or other_receipts)
                if chat_is_group and is_mine:
                    is_read = len(counted) > 0 and read_count == len(counted)
                reply_to = None
                if r[18] is not None:
                    reply_removed = r[22] is not None
                    reply_to = {
                        "id": r[18],
                        "text": "" if reply_removed else (r[19] or r[21] or ""),
                        "kind": r[20] or "text",
                        "senderName": r[23],
                        "removed": reply_removed,
                    }
                messages.append({
                    "id": r[0],
                    "text": "" if removed else r[1],
                    "sender_id": r[2],
                    "out": r[2] == my_user_id,
                    "read": is_read,
                    "delivered": delivered or is_read,
                    "readCount": read_count if (is_mine and chat_is_group) else None,
                    "recipientsCount": len(counted) if (is_mine and chat_is_group) else None,
                    "time": r[4],
                    "kind": "text" if removed else (r[6] or "text"),
                    "mediaUrl": None if removed else r[7],
                    "duration": r[8],
                    "transcript": None if removed else r[9],
                    "senderName": r[10],
                    "senderColor": r[11],
                    "senderInitials": r[12],
                    "senderAvatarUrl": r[13],
                    "fileName": None if removed else r[14],
                    "fileSize": None if removed else r[15],
                    "edited": r[16] is not None and not removed,
                    "forwardedFrom": None if removed else r[24],
                    "removed": removed,
                    "replyTo": reply_to,
                    "reactions": {} if removed else reactions_by_msg.get(r[0], {}),
                })
            return reply(200, {"messages": messages})

        # GET /chats?action=status&chat_id=X — присутствие и набор текста собеседника
        if method == "GET" and action == "status":
            chat_id = int(params["chat_id"])
            if not is_member(cur, chat_id, my_user_id):
                return reply(403, {"error": "Нет доступа к чату"})
            cur.execute(f"""
                SELECT EXTRACT(EPOCH FROM (NOW() - u.last_seen)),
                       (cm.typing_until IS NOT NULL AND cm.typing_until > NOW() AND u.show_typing),
                       u.show_online
                FROM {SCHEMA}.chat_members cm
                JOIN {SCHEMA}.users u ON u.id = cm.user_id
                WHERE cm.chat_id = %s AND cm.user_id != %s
                LIMIT 1
            """, (chat_id, my_user_id))
            row = cur.fetchone()
            seen_ago = row[0] if row and row[2] else None
            return reply(200, {
                "typing": bool(row[1]) if row else False,
                "online": is_online(seen_ago),
                "statusText": status_text(seen_ago),
            })

        # POST /chats?action=typing — «печатает…» в чате
        if method == "POST" and action == "typing":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            chat_id = body.get("chat_id")
            if not chat_id or not is_member(cur, int(chat_id), my_user_id):
                return reply(400, {"error": "Некорректный чат"})
            cur.execute(f"""
                UPDATE {SCHEMA}.chat_members
                SET typing_until = NOW() + INTERVAL '{TYPING_TTL_SEC} seconds'
                WHERE chat_id = %s AND user_id = %s
            """, (chat_id, my_user_id))
            conn.commit()
            return reply(200, {"ok": True})

        # POST /chats?action=create-group — создать группу на сервере
        if method == "POST" and action == "create-group":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            name = (body.get("name") or "").strip()[:100]
            raw_ids = body.get("member_ids") or []
            member_ids = sorted({int(x) for x in raw_ids if x and int(x) != my_user_id})
            if not name or not member_ids:
                return reply(400, {"error": "Укажите название и участников"})
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE id = ANY(%s)", (member_ids,))
            valid_ids = [r[0] for r in cur.fetchall()]
            if not valid_ids:
                return reply(400, {"error": "Участники не найдены"})
            color = GROUP_COLORS[sum(ord(ch) for ch in name) % len(GROUP_COLORS)]
            cur.execute(f"""
                INSERT INTO {SCHEMA}.chats (is_group, name, avatar_color, created_by)
                VALUES (true, %s, %s, %s) RETURNING id
            """, (name, color, my_user_id))
            chat_id = cur.fetchone()[0]
            for uid in [my_user_id] + valid_ids:
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.chat_members (chat_id, user_id, role)
                    VALUES (%s, %s, %s) ON CONFLICT (chat_id, user_id) DO NOTHING
                """, (chat_id, uid, "owner" if uid == my_user_id else "member"))
            conn.commit()
            return reply(200, {"chat_id": chat_id})

        # POST /chats?action=leave-group — выйти из группы
        if method == "POST" and action == "leave-group":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            chat_id = body.get("chat_id")
            cur.execute(f"SELECT is_group FROM {SCHEMA}.chats WHERE id = %s", (chat_id,))
            chat_row = cur.fetchone()
            if not chat_row or not chat_row[0]:
                return reply(400, {"error": "Чат не найден или не является группой"})
            if get_role(cur, chat_id, my_user_id) == "owner":
                promote_successor(cur, chat_id, my_user_id)
            cur.execute(f"""
                DELETE FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s
            """, (chat_id, my_user_id))
            conn.commit()
            return reply(200, {"ok": True})

        # GET /chats?action=topics&chat_id=X — темы группы
        if method == "GET" and action == "topics":
            chat_id = int(params["chat_id"])
            if not is_member(cur, chat_id, my_user_id):
                return reply(403, {"error": "Нет доступа к чату"})
            cur.execute(f"""
                SELECT id, name, color, pinned FROM {SCHEMA}.chat_topics
                WHERE chat_id = %s ORDER BY created_at ASC, id ASC
            """, (chat_id,))
            topics = [{"id": r[0], "name": r[1], "color": r[2], "pinned": r[3]} for r in cur.fetchall()]
            return reply(200, {"topics": topics})

        # POST /chats?action=create-topic — создать тему в группе
        if method == "POST" and action == "create-topic":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            chat_id = body.get("chat_id")
            name = (body.get("name") or "").strip()[:100]
            color = (body.get("color") or "#a855f7")[:16]
            if not chat_id or not name:
                return reply(400, {"error": "Укажите название темы"})
            cur.execute(f"SELECT is_group FROM {SCHEMA}.chats WHERE id = %s", (chat_id,))
            chat_row = cur.fetchone()
            if not chat_row or not chat_row[0]:
                return reply(400, {"error": "Темы доступны только в группах"})
            if not is_member(cur, int(chat_id), my_user_id):
                return reply(403, {"error": "Нет доступа к чату"})
            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_topics (chat_id, name, color, created_by)
                VALUES (%s, %s, %s, %s) RETURNING id
            """, (chat_id, name, color, my_user_id))
            topic_id = cur.fetchone()[0]
            conn.commit()
            return reply(200, {"topic": {"id": topic_id, "name": name, "color": color, "pinned": False}})

        # POST /chats?action=toggle-pin-topic — закрепить/открепить тему
        if method == "POST" and action == "toggle-pin-topic":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            topic_id = body.get("topic_id")
            pinned = bool(body.get("pinned"))
            cur.execute(f"""
                UPDATE {SCHEMA}.chat_topics SET pinned = %s
                WHERE id = %s AND chat_id IN (
                    SELECT chat_id FROM {SCHEMA}.chat_members WHERE user_id = %s
                )
                RETURNING id
            """, (pinned, topic_id, my_user_id))
            updated = cur.fetchone()
            conn.commit()
            if not updated:
                return reply(404, {"error": "Тема не найдена"})
            return reply(200, {"pinned": pinned})

        # POST /chats?action=save-transcript — сохранить расшифровку голосового
        if method == "POST" and action == "save-transcript":
            message_id = body.get("message_id")
            transcript = (body.get("transcript") or "").strip()
            if not message_id or not transcript:
                return reply(400, {"error": "Не переданы message_id или transcript"})
            cur.execute(f"UPDATE {SCHEMA}.messages SET transcript = %s WHERE id = %s", (transcript, message_id))
            conn.commit()
            return reply(200, {"ok": True})

        # GET /chats?action=settings — настройки приватности
        if method == "GET" and action == "settings":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            return reply(200, {"settings": read_settings(cur, my_user_id)})

        # POST /chats?action=update-settings — сохранить настройки приватности
        if method == "POST" and action == "update-settings":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            fields = {
                "showOnline": "show_online",
                "showTyping": "show_typing",
                "readReceipts": "read_receipts",
            }
            for key, column in fields.items():
                if key in body:
                    cur.execute(f"UPDATE {SCHEMA}.users SET {column} = %s WHERE id = %s", (bool(body[key]), my_user_id))
            if body.get("whoCanMessage") in ("all", "contacts"):
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET who_can_message = %s WHERE id = %s",
                    (body["whoCanMessage"], my_user_id),
                )
            conn.commit()
            return reply(200, {"settings": read_settings(cur, my_user_id)})

        # POST /chats?action=set-chat-notify — включить или выключить уведомления конкретного чата
        if method == "POST" and action == "set-chat-notify":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            chat_id = body.get("chat_id")
            if not isinstance(chat_id, int) or "enabled" not in body:
                return reply(400, {"error": "Нужны chat_id и enabled"})
            if not is_member(cur, chat_id, my_user_id):
                return reply(403, {"error": "Нет доступа к чату"})
            cur.execute(
                f"UPDATE {SCHEMA}.chat_members SET notify_enabled = %s WHERE chat_id = %s AND user_id = %s",
                (bool(body["enabled"]), chat_id, my_user_id),
            )
            conn.commit()
            return reply(200, {"ok": True, "chat_id": chat_id, "enabled": bool(body["enabled"])})

        # POST /chats?action=pin-message — закрепить сообщение в чате (message_id = null снимает закрепление)
        if method == "POST" and action == "pin-message":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            chat_id = body.get("chat_id")
            message_id = body.get("message_id")
            if not chat_id or not is_member(cur, int(chat_id), my_user_id):
                return reply(403, {"error": "Нет доступа к чату"})
            if message_id:
                cur.execute(f"""
                    SELECT 1 FROM {SCHEMA}.messages
                    WHERE id = %s AND chat_id = %s AND removed_at IS NULL
                """, (message_id, chat_id))
                if not cur.fetchone():
                    return reply(404, {"error": "Сообщение не найдено"})
            else:
                message_id = None
            cur.execute(f"UPDATE {SCHEMA}.chats SET pinned_message_id = %s WHERE id = %s", (message_id, chat_id))
            conn.commit()
            return reply(200, {"ok": True, "pinnedMessageId": message_id})

        # POST /chats?action=edit-message — изменить текст своего сообщения
        if method == "POST" and action == "edit-message":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            message_id = body.get("message_id")
            text = (body.get("text") or "").strip()
            if not message_id or not text:
                return reply(400, {"error": "Укажите текст сообщения"})
            cur.execute(f"""
                SELECT sender_id, kind, removed_at FROM {SCHEMA}.messages WHERE id = %s
            """, (message_id,))
            row = cur.fetchone()
            if not row or row[2] is not None:
                return reply(404, {"error": "Сообщение не найдено"})
            if row[0] != my_user_id:
                return reply(403, {"error": "Можно редактировать только свои сообщения"})
            if row[1] not in ("text", "image", "file"):
                return reply(400, {"error": "Это сообщение нельзя изменить"})
            cur.execute(f"""
                UPDATE {SCHEMA}.messages SET text = %s, edited_at = NOW() WHERE id = %s
            """, (text, message_id))
            conn.commit()
            return reply(200, {"ok": True, "text": text, "edited": True})

        # POST /chats?action=remove-message — убрать своё сообщение из чата
        if method == "POST" and action == "remove-message":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            message_id = body.get("message_id")
            if not message_id:
                return reply(400, {"error": "Не передан message_id"})
            cur.execute(f"""
                UPDATE {SCHEMA}.messages SET removed_at = NOW()
                WHERE id = %s AND sender_id = %s AND removed_at IS NULL
                RETURNING id
            """, (message_id, my_user_id))
            done = cur.fetchone()
            conn.commit()
            if not done:
                return reply(404, {"error": "Сообщение не найдено или оно не ваше"})
            return reply(200, {"ok": True})

        # POST /chats?action=toggle-reaction — поставить/убрать эмодзи-реакцию на сообщение
        if method == "POST" and action == "toggle-reaction":
            message_id = body.get("message_id")
            emoji = (body.get("emoji") or "").strip()
            if not message_id or not emoji:
                return reply(400, {"error": "Не переданы message_id или emoji"})

            cur.execute(f"""
                SELECT id FROM {SCHEMA}.message_reactions
                WHERE message_id = %s AND user_id = %s AND emoji = %s
            """, (message_id, my_user_id, emoji))
            existing = cur.fetchone()

            if existing:
                cur.execute(f"""
                    DELETE FROM {SCHEMA}.message_reactions WHERE message_id = %s AND user_id = %s AND emoji = %s
                """, (message_id, my_user_id, emoji))
                added = False
            else:
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.message_reactions (message_id, user_id, emoji)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (message_id, user_id, emoji) DO NOTHING
                """, (message_id, my_user_id, emoji))
                added = True
            conn.commit()

            cur.execute(f"""
                SELECT emoji, user_id FROM {SCHEMA}.message_reactions WHERE message_id = %s
            """, (message_id,))
            reactions: dict = {}
            for em, uid in cur.fetchall():
                reactions.setdefault(em, []).append(uid)

            return reply(200, {"added": added, "reactions": reactions})

        # POST /chats?action=pin — закрепить/открепить чат
        if method == "POST" and action == "pin":
            chat_id = body.get("chat_id")
            pinned = bool(body.get("pinned"))
            cur.execute(f"""
                UPDATE {SCHEMA}.chat_members SET pinned = %s
                WHERE chat_id = %s AND user_id = %s
            """, (pinned, chat_id, my_user_id))
            conn.commit()
            return reply(200, {"pinned": pinned})

        # GET /chats?action=members&chat_id=X — список участников группы
        if method == "GET" and action == "members":
            chat_id = int(params["chat_id"])
            if not is_member(cur, chat_id, my_user_id):
                return reply(403, {"error": "Нет доступа к чату"})
            cur.execute(f"""
                SELECT u.id, u.display_name, u.avatar_initials, u.avatar_color, u.avatar_url, cm.role
                FROM {SCHEMA}.users u
                JOIN {SCHEMA}.chat_members cm ON cm.user_id = u.id
                WHERE cm.chat_id = %s
                ORDER BY CASE cm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.display_name
            """, (chat_id,))
            rows = cur.fetchall()
            members = [{
                "id": r[0], "displayName": r[1], "avatarInitials": r[2],
                "avatarColor": r[3], "avatarUrl": r[4], "role": r[5],
            } for r in rows]
            cur.execute(f"SELECT name, description, avatar_url, avatar_color FROM {SCHEMA}.chats WHERE id = %s", (chat_id,))
            info = cur.fetchone()
            return reply(200, {
                "members": members,
                "myRole": get_role(cur, chat_id, my_user_id),
                "group": {"name": info[0], "description": info[1] or "", "avatarUrl": info[2], "color": info[3]} if info else None,
            })

        # POST /chats?action=add-member — добавить участника в группу
        if method == "POST" and action == "add-member":
            chat_id = body.get("chat_id")
            user_id = body.get("user_id")
            cur.execute(f"SELECT is_group FROM {SCHEMA}.chats WHERE id = %s", (chat_id,))
            chat_row = cur.fetchone()
            if not chat_row or not chat_row[0]:
                return reply(400, {"error": "Чат не найден или не является группой"})
            if not is_member(cur, int(chat_id), my_user_id):
                return reply(403, {"error": "Нет доступа к чату"})
            if get_role(cur, int(chat_id), my_user_id) not in ("owner", "admin"):
                return reply(403, {"error": "Добавлять участников могут владелец и администраторы"})
            cur.execute(f"SELECT 1 FROM {SCHEMA}.users WHERE id = %s", (user_id,))
            if not cur.fetchone():
                return reply(404, {"error": "Пользователь не найден"})
            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_members (chat_id, user_id)
                VALUES (%s, %s)
                ON CONFLICT (chat_id, user_id) DO NOTHING
            """, (chat_id, user_id))
            conn.commit()
            return reply(200, {"ok": True})

        # POST /chats?action=start-chat — создать (или найти существующий) личный чат с пользователем
        if method == "POST" and action == "start-chat":
            other_user_id = body.get("user_id")
            if not other_user_id or other_user_id == my_user_id:
                return reply(400, {"error": "Некорректный пользователь"})
            cur.execute(f"SELECT who_can_message FROM {SCHEMA}.users WHERE id = %s", (other_user_id,))
            policy = cur.fetchone()
            if policy and policy[0] == "contacts":
                cur.execute(f"""
                    SELECT 1 FROM {SCHEMA}.chat_members a
                    JOIN {SCHEMA}.chat_members b ON b.chat_id = a.chat_id
                    JOIN {SCHEMA}.chats c ON c.id = a.chat_id
                    WHERE a.user_id = %s AND b.user_id = %s AND c.is_group = false
                    LIMIT 1
                """, (my_user_id, other_user_id))
                if not cur.fetchone():
                    return reply(403, {"error": "Этот пользователь принимает сообщения только от контактов"})

            cur.execute(f"""
                SELECT c.id FROM {SCHEMA}.chats c
                JOIN {SCHEMA}.chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = %s
                JOIN {SCHEMA}.chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = %s
                WHERE c.is_group = false
                LIMIT 1
            """, (my_user_id, other_user_id))
            existing = cur.fetchone()

            if existing:
                chat_id = existing[0]
            else:
                cur.execute(f"SELECT display_name, avatar_color FROM {SCHEMA}.users WHERE id = %s", (other_user_id,))
                other = cur.fetchone()
                if not other:
                    return reply(404, {"error": "Пользователь не найден"})
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.chats (is_group, name, avatar_color)
                    VALUES (false, %s, %s)
                    RETURNING id
                """, (other[0], other[1]))
                chat_id = cur.fetchone()[0]
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.chat_members (chat_id, user_id) VALUES (%s, %s), (%s, %s)
                """, (chat_id, my_user_id, chat_id, other_user_id))
                conn.commit()

            return reply(200, {"chat_id": chat_id})

        # POST /chats?action=remove-member — удалить участника из группы
        if method == "POST" and action == "remove-member":
            chat_id = body.get("chat_id")
            user_id = body.get("user_id")
            if not isinstance(chat_id, int) or not isinstance(user_id, int):
                return reply(400, {"error": "Нужны chat_id и user_id"})
            my_role = get_role(cur, chat_id, my_user_id)
            if my_role is None:
                return reply(403, {"error": "Нет доступа к чату"})
            if my_role not in ("owner", "admin"):
                return reply(403, {"error": "Удалять участников могут владелец и администраторы"})
            if user_id == my_user_id:
                return reply(400, {"error": "Чтобы выйти из группы, используйте «Покинуть группу»"})
            target_role = get_role(cur, chat_id, user_id)
            if target_role is None:
                return reply(404, {"error": "Участник не найден"})
            if target_role == "owner":
                return reply(403, {"error": "Владельца группы удалить нельзя"})
            if target_role == "admin" and my_role != "owner":
                return reply(403, {"error": "Администратора может удалить только владелец"})
            cur.execute(f"""
                DELETE FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s
            """, (chat_id, user_id))
            conn.commit()
            return reply(200, {"ok": True})

        # POST /chats?action=update-group — название, описание и аватар группы
        if method == "POST" and action == "update-group":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            chat_id = body.get("chat_id")
            if not isinstance(chat_id, int) or not is_group_chat(cur, chat_id):
                return reply(400, {"error": "Группа не найдена"})
            if get_role(cur, chat_id, my_user_id) not in ("owner", "admin"):
                return reply(403, {"error": "Менять группу могут владелец и администраторы"})
            if "name" in body:
                name = (body.get("name") or "").strip()[:100]
                if not name:
                    return reply(400, {"error": "Название не может быть пустым"})
                cur.execute(f"UPDATE {SCHEMA}.chats SET name = %s WHERE id = %s", (name, chat_id))
            if "description" in body:
                cur.execute(f"UPDATE {SCHEMA}.chats SET description = %s WHERE id = %s", ((body.get("description") or "").strip()[:300] or None, chat_id))
            if body.get("removeAvatar"):
                cur.execute(f"UPDATE {SCHEMA}.chats SET avatar_url = NULL WHERE id = %s", (chat_id,))
            elif body.get("imageBase64"):
                try:
                    data, ctype, ext = decode_image(body, MAX_AVATAR_BYTES)
                except ValueError as e:
                    return reply(400, {"error": str(e)})
                url = save_file(f"group-avatars/{chat_id}-{uuid.uuid4().hex}.{ext}", data, ctype)
                cur.execute(f"UPDATE {SCHEMA}.chats SET avatar_url = %s WHERE id = %s", (url, chat_id))
            conn.commit()
            cur.execute(f"SELECT name, description, avatar_url FROM {SCHEMA}.chats WHERE id = %s", (chat_id,))
            g = cur.fetchone()
            return reply(200, {"group": {"name": g[0], "description": g[1] or "", "avatarUrl": g[2]}})

        # POST /chats?action=set-role — назначить или снять администратора (только владелец)
        if method == "POST" and action == "set-role":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            chat_id = body.get("chat_id")
            user_id = body.get("user_id")
            role = body.get("role")
            if not isinstance(chat_id, int) or not isinstance(user_id, int) or role not in ("admin", "member"):
                return reply(400, {"error": "Нужны chat_id, user_id и role (admin или member)"})
            if not is_group_chat(cur, chat_id):
                return reply(400, {"error": "Группа не найдена"})
            if get_role(cur, chat_id, my_user_id) != "owner":
                return reply(403, {"error": "Назначать администраторов может только владелец"})
            target_role = get_role(cur, chat_id, user_id)
            if target_role is None:
                return reply(404, {"error": "Участник не найден"})
            if target_role == "owner":
                return reply(400, {"error": "Роль владельца менять нельзя. Передайте группу другому человеку"})
            cur.execute(f"UPDATE {SCHEMA}.chat_members SET role = %s WHERE chat_id = %s AND user_id = %s", (role, chat_id, user_id))
            conn.commit()
            return reply(200, {"ok": True, "role": role})

        # POST /chats?action=transfer-owner — передать группу другому участнику (только владелец)
        if method == "POST" and action == "transfer-owner":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            chat_id = body.get("chat_id")
            user_id = body.get("user_id")
            if not isinstance(chat_id, int) or not isinstance(user_id, int):
                return reply(400, {"error": "Нужны chat_id и user_id"})
            if not is_group_chat(cur, chat_id):
                return reply(400, {"error": "Группа не найдена"})
            if get_role(cur, chat_id, my_user_id) != "owner":
                return reply(403, {"error": "Передать группу может только владелец"})
            if user_id == my_user_id:
                return reply(400, {"error": "Вы уже владелец"})
            if get_role(cur, chat_id, user_id) is None:
                return reply(404, {"error": "Участник не найден"})
            cur.execute(f"UPDATE {SCHEMA}.chat_members SET role = 'owner' WHERE chat_id = %s AND user_id = %s", (chat_id, user_id))
            cur.execute(f"UPDATE {SCHEMA}.chat_members SET role = 'admin' WHERE chat_id = %s AND user_id = %s", (chat_id, my_user_id))
            conn.commit()
            return reply(200, {"ok": True})

        # POST /chats?action=set-chat-bg — личный фон чата (виден только мне)
        if method == "POST" and action == "set-chat-bg":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            chat_id = body.get("chat_id")
            if not isinstance(chat_id, int) or not is_member(cur, chat_id, my_user_id):
                return reply(403, {"error": "Нет доступа к чату"})
            bg = body.get("bg")
            if bg is not None and not (isinstance(bg, str) and BG_RE.match(bg)):
                return reply(400, {"error": "Некорректный фон"})
            if body.get("imageBase64"):
                try:
                    data, ctype, ext = decode_image(body, MAX_BG_BYTES)
                except ValueError as e:
                    return reply(400, {"error": str(e)})
                bg = "img:" + save_file(f"chat-bg/{chat_id}-{my_user_id}-{uuid.uuid4().hex}.{ext}", data, ctype)
            cur.execute(f"UPDATE {SCHEMA}.chat_members SET chat_bg = %s WHERE chat_id = %s AND user_id = %s", (bg, chat_id, my_user_id))
            conn.commit()
            return reply(200, {"ok": True, "bg": bg})

        # GET /chats?action=read-by&message_id=X — кто прочитал моё сообщение
        if method == "GET" and action == "read-by":
            try:
                message_id = int(params.get("message_id"))
            except (TypeError, ValueError):
                return reply(400, {"error": "Нужен message_id"})
            cur.execute(f"SELECT chat_id, sender_id, created_at FROM {SCHEMA}.messages WHERE id = %s", (message_id,))
            msg = cur.fetchone()
            if not msg or not is_member(cur, msg[0], my_user_id):
                return reply(403, {"error": "Нет доступа к сообщению"})
            if msg[1] != my_user_id:
                return reply(403, {"error": "Список прочитавших видит только автор сообщения"})
            cur.execute(f"""
                SELECT u.id, u.display_name, u.avatar_initials, u.avatar_color, u.avatar_url,
                       u.read_receipts, cm.last_read_at
                FROM {SCHEMA}.chat_members cm
                JOIN {SCHEMA}.users u ON u.id = cm.user_id
                WHERE cm.chat_id = %s AND cm.user_id != %s
                ORDER BY u.display_name
            """, (msg[0], my_user_id))
            readers, unread, hidden = [], [], []
            for r in cur.fetchall():
                person = {"id": r[0], "displayName": r[1], "avatarInitials": r[2], "avatarColor": r[3], "avatarUrl": r[4]}
                if not r[5]:
                    hidden.append(person)
                elif r[6] is not None and r[6] >= msg[2]:
                    readers.append(person)
                else:
                    unread.append(person)
            return reply(200, {"readers": readers, "unread": unread, "hidden": hidden})

        # GET /chats — список чатов
        cur.execute(f"""
            SELECT
                c.id,
                c.name,
                c.is_group,
                c.avatar_color,
                (
                    SELECT CASE WHEN m.removed_at IS NOT NULL THEN 'Сообщение удалено'
                                WHEN m.kind = 'voice' THEN '🎤 Голосовое сообщение'
                                WHEN m.kind = 'circle' THEN '⭕ Видеосообщение'
                                WHEN m.kind = 'image' THEN '🖼 Фото'
                                WHEN m.kind = 'file' THEN '📎 ' || COALESCE(m.file_name, 'Файл')
                                WHEN m.kind = 'text' AND m.text ~* '^(https?://[^ ]+|/gifs/[^ ]+)[.]gif$' THEN '🎞 GIF'
                                ELSE m.text END
                    FROM {SCHEMA}.messages m
                    WHERE m.chat_id = c.id
                    ORDER BY m.created_at DESC LIMIT 1
                ) as last_msg,
                (
                    SELECT TO_CHAR(m.created_at, 'HH24:MI') FROM {SCHEMA}.messages m
                    WHERE m.chat_id = c.id
                    ORDER BY m.created_at DESC LIMIT 1
                ) as last_time,
                (
                    SELECT COUNT(*) FROM {SCHEMA}.messages m
                    WHERE m.chat_id = c.id AND m.sender_id != %(me)s AND m.removed_at IS NULL
                      AND CASE WHEN cm_me.last_read_at IS NOT NULL
                               THEN m.created_at > cm_me.last_read_at
                               ELSE m.is_read = false END
                ) as unread_count,
                o.id as other_id,
                o.display_name as other_name,
                o.avatar_color as other_color,
                o.avatar_initials as other_initials,
                o.avatar_url as other_avatar_url,
                EXTRACT(EPOCH FROM (NOW() - o.last_seen)) as seen_ago,
                (o.typing_until IS NOT NULL AND o.typing_until > NOW() AND o.show_typing) as other_typing,
                cm_me.pinned as pinned,
                (SELECT COUNT(*) FROM {SCHEMA}.chat_members x WHERE x.chat_id = c.id) as members_count,
                pm.id, pm.text, pm.kind, pm.file_name, pm.topic_id, pu.display_name,
                cm_me.notify_enabled,
                c.avatar_url, c.description, cm_me.role, cm_me.chat_bg
            FROM {SCHEMA}.chats c
            JOIN {SCHEMA}.chat_members cm_me ON cm_me.chat_id = c.id AND cm_me.user_id = %(me)s
            LEFT JOIN {SCHEMA}.messages pm ON pm.id = c.pinned_message_id AND pm.removed_at IS NULL
            LEFT JOIN {SCHEMA}.users pu ON pu.id = pm.sender_id
            LEFT JOIN LATERAL (
                SELECT u.id, u.display_name, u.avatar_color, u.avatar_initials, u.avatar_url,
                       CASE WHEN u.show_online THEN u.last_seen ELSE NULL END AS last_seen,
                       cm.typing_until, u.show_typing
                FROM {SCHEMA}.chat_members cm
                JOIN {SCHEMA}.users u ON u.id = cm.user_id
                WHERE cm.chat_id = c.id AND cm.user_id != %(me)s AND NOT c.is_group
                LIMIT 1
            ) o ON TRUE
            ORDER BY COALESCE(
                (SELECT MAX(m.created_at) FROM {SCHEMA}.messages m WHERE m.chat_id = c.id),
                c.created_at
            ) DESC NULLS LAST
        """, {"me": my_user_id})

        rows = cur.fetchall()
        chats = []
        for r in rows:
            is_group = bool(r[2])
            seen_ago = float(r[12]) if r[12] is not None else None
            display_name = r[1] if is_group else (r[8] or r[1])
            display_color = r[3] if is_group else (r[9] or r[3])
            if is_group:
                avatar = (display_name or "??")[:2].upper()
            else:
                avatar = r[10] or (display_name or "??")[:2].upper()
            chats.append({
                "id": r[0],
                "name": display_name,
                "isGroup": is_group,
                "color": display_color,
                "lastMsg": r[4] or ("Группа создана" if is_group else ""),
                "time": r[5] or "",
                "unread": int(r[6]) if r[6] else 0,
                "online": False if is_group else is_online(seen_ago),
                "statusText": "" if is_group else status_text(seen_ago),
                "typing": False if is_group else bool(r[13]),
                "avatar": avatar,
                "pinned": bool(r[14]) if r[14] is not None else False,
                "avatarUrl": r[23] if is_group else r[11],
                "description": (r[24] or "") if is_group else "",
                "myRole": r[25] if is_group else None,
                "chatBg": r[26],
                "contactUserId": None if is_group else r[7],
                "memberCount": int(r[15]) if is_group and r[15] is not None else None,
                "notifyEnabled": True if r[22] is None else bool(r[22]),
                "pinnedMessage": None if r[16] is None else {
                    "id": r[16],
                    "text": r[17] or "",
                    "kind": r[18] or "text",
                    "fileName": r[19],
                    "topicId": r[20],
                    "senderName": r[21],
                },
            })

        cur.execute(f"""
            SELECT 1 FROM {SCHEMA}.calls
            WHERE callee_id = %s AND status = 'ringing' AND created_at > NOW() - INTERVAL '45 seconds'
            LIMIT 1
        """, (my_user_id,))
        incoming_call = cur.fetchone() is not None

        cur.execute(f"""
            SELECT g.id, g.chat_id, g.is_video,
                   (SELECT COUNT(*) FROM {SCHEMA}.group_call_members m
                    WHERE m.call_id = g.id AND m.left_at IS NULL AND m.last_ping > NOW() - INTERVAL '20 seconds')
            FROM {SCHEMA}.group_calls g
            JOIN {SCHEMA}.chat_members cm ON cm.chat_id = g.chat_id AND cm.user_id = %s
            WHERE g.status = 'active'
        """, (my_user_id,))
        group_calls = [
            {"callId": r[0], "chatId": r[1], "isVideo": bool(r[2]), "participants": int(r[3])}
            for r in cur.fetchall() if r[3] and int(r[3]) > 0
        ]

        return reply(200, {"chats": chats, "incomingCall": incoming_call, "groupCalls": group_calls})

    finally:
        cur.close()
        conn.close()

