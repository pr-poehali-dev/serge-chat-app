"""Чаты, группы, темы, сообщения, присутствие и индикатор набора для мессенджера Трынделка"""
import base64
import json
import os
import re
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone

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


STICKER_RE = re.compile(r"^/stickers/(animals|food|hearts|party)/[a-z0-9-]{1,30}\.png$")
MOOD_EMOJI_RE = re.compile(r"^[^\w\s<>&\"'`]{1,8}$")
MAX_POLL_OPTIONS = 10
MIN_POLL_OPTIONS = 2


def clean_text(value, limit: int) -> str:
    return re.sub(r"[\u0000-\u0008\u000b\u000c\u000e-\u001f]", "", str(value or "")).strip()[:limit]


def load_poll(cur, poll_id: int, me: int) -> dict:
    cur.execute(f"""
        SELECT p.id, p.chat_id, p.message_id, p.question, p.multiple, p.closed, p.created_by
        FROM {SCHEMA}.polls p WHERE p.id = %s
    """, (poll_id,))
    p = cur.fetchone()
    if not p:
        return {}
    cur.execute(f"""
        SELECT o.id, o.text, COUNT(v.user_id)
        FROM {SCHEMA}.poll_options o
        LEFT JOIN {SCHEMA}.poll_votes v ON v.option_id = o.id
        WHERE o.poll_id = %s
        GROUP BY o.id, o.text, o.position
        ORDER BY o.position, o.id
    """, (poll_id,))
    rows = cur.fetchall()
    cur.execute(f"SELECT option_id FROM {SCHEMA}.poll_votes WHERE poll_id = %s AND user_id = %s", (poll_id, me))
    mine = {r[0] for r in cur.fetchall()}
    cur.execute(f"SELECT COUNT(DISTINCT user_id) FROM {SCHEMA}.poll_votes WHERE poll_id = %s", (poll_id,))
    voters = cur.fetchone()[0]
    total_votes = sum(r[2] for r in rows)
    options = []
    for oid, text, count in rows:
        percent = round(count * 100 / voters) if voters else 0
        options.append({"id": oid, "text": text, "votes": int(count), "percent": percent, "mine": oid in mine})
    return {
        "id": p[0], "messageId": p[2], "question": p[3], "multiple": bool(p[4]), "closed": bool(p[5]),
        "createdBy": p[6], "voters": int(voters), "totalVotes": int(total_votes), "options": options,
        "myVoted": bool(mine),
    }


def poll_for_message(cur, message_id: int):
    cur.execute(f"""
        SELECT id FROM {SCHEMA}.polls WHERE message_id = %s
        UNION ALL
        SELECT poll_id FROM {SCHEMA}.poll_shares WHERE message_id = %s
    """, (message_id, message_id))
    row = cur.fetchone()
    return row[0] if row else None


def can_access_poll(cur, poll_id: int, user_id: int, code=None) -> bool:
    """Опрос доступен участникам исходного чата, чатов куда его переслали, и всем у кого есть ссылка"""
    cur.execute(f"SELECT chat_id, share_code FROM {SCHEMA}.polls WHERE id = %s", (poll_id,))
    p = cur.fetchone()
    if not p:
        return False
    if code and p[1] and str(code) == p[1]:
        return True
    cur.execute(f"""
        SELECT 1 FROM {SCHEMA}.chat_members cm
        WHERE cm.user_id = %s
          AND (cm.chat_id = %s OR cm.chat_id IN (SELECT chat_id FROM {SCHEMA}.poll_shares WHERE poll_id = %s))
        LIMIT 1
    """, (user_id, p[0], poll_id))
    return cur.fetchone() is not None


def pinned_poll(cur, message_id: int, user_id: int):
    poll_id = poll_for_message(cur, message_id)
    if not poll_id:
        return None
    poll = load_poll(cur, poll_id, user_id)
    if poll:
        poll["messageId"] = message_id
    return poll or None


def scheduled_item(sid, chat_id, topic_id, text, epoch, kind, media_url, file_name) -> dict:
    return {
        "id": sid, "chatId": chat_id, "topicId": topic_id, "text": text or "",
        "sendAtMs": int(float(epoch) * 1000), "kind": kind or "text",
        "mediaUrl": media_url, "fileName": file_name,
    }


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def parse_send_at(value: str):
    """Строка ISO со смещением -> наивное время UTC, либо None"""
    if not SEND_AT_RE.match(value):
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        return None
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def trigger_due(cur) -> None:
    """Если есть сообщения, время которых пришло, просим функцию отправки разослать их (с уведомлениями)"""
    cur.execute(f"""
        SELECT 1 FROM {SCHEMA}.scheduled_messages
        WHERE status = 'pending' AND send_at <= %s LIMIT 1
    """, (utc_now_naive(),))
    if not cur.fetchone():
        return
    try:
        req = urllib.request.Request(
            SEND_MESSAGE_URL,
            data=json.dumps({"action": "dispatch-due"}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=4).read()
    except Exception as e:
        print(f"dispatch trigger failed: {type(e).__name__}")


def int_list(value, limit: int = 100) -> list:
    if not isinstance(value, list):
        return []
    return [x for x in value if isinstance(x, int) and not isinstance(x, bool)][:limit]


STICKER_ANY_RE = re.compile(r"^(/stickers/|https?://\S+/stickers/user/)\S+$")
CUSTOM_STICKER_MAX_BYTES = 1024 * 1024
MAX_PACKS = 10
MAX_STICKERS_PER_PACK = 60
MAX_SCHEDULED = 50
SCHEDULED_FILE_MAX_BYTES = 8 * 1024 * 1024
SEND_MESSAGE_URL = os.environ.get("SEND_MESSAGE_URL") or "https://functions.poehali.dev/d2179cfe-604e-4dda-9a8e-94247336ffb6"
SEND_AT_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$")


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
        f"""SELECT show_online, show_typing, read_receipts, who_can_message,
                   quiet_enabled, quiet_from, quiet_to, quiet_tz
            FROM {SCHEMA}.users WHERE id = %s""",
        (user_id,),
    )
    row = cur.fetchone()
    if not row:
        return {"showOnline": True, "showTyping": True, "readReceipts": True, "whoCanMessage": "all",
                "quietEnabled": False, "quietFrom": 1380, "quietTo": 480}
    return {"showOnline": row[0], "showTyping": row[1], "readReceipts": row[2], "whoCanMessage": row[3],
            "quietEnabled": bool(row[4]), "quietFrom": row[5], "quietTo": row[6], "quietTz": row[7]}


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

        if authed and (method == "GET" and action in (None, "messages")):
            trigger_due(cur)

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
                  AND NOT EXISTS (SELECT 1 FROM {SCHEMA}.hidden_messages h WHERE h.message_id = m.id AND h.user_id = %s)
                ORDER BY m.created_at ASC
            """, (chat_id, topic_id, my_user_id))
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
            polls_by_msg: dict = {}
            if message_ids:
                cur.execute(f"""
                    SELECT id, message_id FROM {SCHEMA}.polls WHERE message_id = ANY(%s)
                    UNION ALL
                    SELECT poll_id, message_id FROM {SCHEMA}.poll_shares WHERE message_id = ANY(%s)
                """, (message_ids, message_ids))
                for pid, mid in cur.fetchall():
                    poll_data = load_poll(cur, pid, my_user_id)
                    if poll_data:
                        poll_data["messageId"] = mid
                        polls_by_msg[mid] = poll_data
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
                    "poll": None if removed else polls_by_msg.get(r[0]),
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
            if "quietEnabled" in body:
                cur.execute(f"UPDATE {SCHEMA}.users SET quiet_enabled = %s WHERE id = %s", (bool(body["quietEnabled"]), my_user_id))
            for key, column, low, high in (("quietFrom", "quiet_from", 0, 1439), ("quietTo", "quiet_to", 0, 1439), ("quietTz", "quiet_tz", -840, 840)):
                val = body.get(key)
                if isinstance(val, int) and not isinstance(val, bool) and low <= val <= high:
                    cur.execute(f"UPDATE {SCHEMA}.users SET {column} = %s WHERE id = %s", (val, my_user_id))
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
                SELECT sender_id, kind, removed_at, text FROM {SCHEMA}.messages WHERE id = %s
            """, (message_id,))
            row = cur.fetchone()
            if not row or row[2] is not None:
                return reply(404, {"error": "Сообщение не найдено"})
            if row[0] != my_user_id:
                return reply(403, {"error": "Можно редактировать только свои сообщения"})
            if row[1] not in ("text", "image", "file"):
                return reply(400, {"error": "Это сообщение нельзя изменить"})
            old_text = (row[3] or "").strip()
            if poll_for_message(cur, message_id) or STICKER_ANY_RE.match(old_text) or re.match(r"^\S+\.gif$", old_text, re.I):
                return reply(400, {"error": "Опрос, стикер и GIF изменить нельзя"})
            text = clean_text(text, 4000)
            if not text:
                return reply(400, {"error": "Укажите текст сообщения"})
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
                SELECT u.id, u.display_name, u.avatar_initials, u.avatar_color, u.avatar_url, cm.role,
                       u.mood_emoji, u.mood_text
                FROM {SCHEMA}.users u
                JOIN {SCHEMA}.chat_members cm ON cm.user_id = u.id
                WHERE cm.chat_id = %s
                ORDER BY CASE cm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.display_name
            """, (chat_id,))
            rows = cur.fetchall()
            members = [{
                "id": r[0], "displayName": r[1], "avatarInitials": r[2],
                "avatarColor": r[3], "avatarUrl": r[4], "role": r[5],
                "moodEmoji": r[6] or "", "moodText": r[7] or "",
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

        # POST /chats?action=create-poll — опрос в группе
        if method == "POST" and action == "create-poll":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            chat_id = body.get("chat_id")
            if not isinstance(chat_id, int) or not is_group_chat(cur, chat_id):
                return reply(400, {"error": "Опросы доступны только в группах"})
            if not is_member(cur, chat_id, my_user_id):
                return reply(403, {"error": "Нет доступа к чату"})
            question = clean_text(body.get("question"), 300)
            raw_options = body.get("options") if isinstance(body.get("options"), list) else []
            options = []
            for o in raw_options:
                t = clean_text(o, 120)
                if t and t.lower() not in [x.lower() for x in options]:
                    options.append(t)
            if not question:
                return reply(400, {"error": "Напишите вопрос"})
            if len(options) < MIN_POLL_OPTIONS:
                return reply(400, {"error": "Нужно минимум два разных варианта ответа"})
            if len(options) > MAX_POLL_OPTIONS:
                return reply(400, {"error": f"Не больше {MAX_POLL_OPTIONS} вариантов"})
            topic_id = body.get("topic_id")
            if topic_id:
                cur.execute(f"SELECT 1 FROM {SCHEMA}.chat_topics WHERE id = %s AND chat_id = %s", (topic_id, chat_id))
                if not cur.fetchone():
                    return reply(400, {"error": "Тема не найдена"})
            else:
                topic_id = None
            cur.execute(f"""
                INSERT INTO {SCHEMA}.messages (chat_id, sender_id, text, is_read, kind, topic_id)
                VALUES (%s, %s, %s, false, 'text', %s) RETURNING id, TO_CHAR(created_at, 'HH24:MI')
            """, (chat_id, my_user_id, "📊 " + question, topic_id))
            mid, mtime = cur.fetchone()
            cur.execute(f"""
                INSERT INTO {SCHEMA}.polls (chat_id, message_id, question, multiple, created_by)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (chat_id, mid, question, bool(body.get("multiple")), my_user_id))
            poll_id = cur.fetchone()[0]
            for i, t in enumerate(options):
                cur.execute(f"INSERT INTO {SCHEMA}.poll_options (poll_id, text, position) VALUES (%s, %s, %s)", (poll_id, t, i))
            conn.commit()
            poll = load_poll(cur, poll_id, my_user_id)
            return reply(200, {"messageId": mid, "time": mtime, "poll": poll})

        # POST /chats?action=vote-poll — проголосовать (повторный запрос заменяет прежний выбор)
        if method == "POST" and action == "vote-poll":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            poll_id = body.get("poll_id")
            option_ids = body.get("option_ids")
            if not isinstance(poll_id, int) or not isinstance(option_ids, list):
                return reply(400, {"error": "Нужны poll_id и option_ids"})
            cur.execute(f"SELECT chat_id, multiple, closed FROM {SCHEMA}.polls WHERE id = %s", (poll_id,))
            p = cur.fetchone()
            if not p:
                return reply(404, {"error": "Опрос не найден"})
            if not can_access_poll(cur, poll_id, my_user_id, body.get("code")):
                return reply(403, {"error": "Нет доступа к опросу"})
            if p[2]:
                return reply(409, {"error": "Опрос уже закрыт", "code": "closed"})
            wanted = sorted({int(x) for x in option_ids if isinstance(x, int)})
            if len(wanted) != len(option_ids) and len(set(option_ids)) != len(wanted):
                return reply(400, {"error": "Некорректные варианты"})
            if not p[1] and len(wanted) > 1:
                return reply(400, {"error": "В этом опросе можно выбрать только один вариант"})
            if wanted:
                cur.execute(f"SELECT id FROM {SCHEMA}.poll_options WHERE poll_id = %s AND id = ANY(%s)", (poll_id, wanted))
                if len(cur.fetchall()) != len(wanted):
                    return reply(400, {"error": "Такого варианта нет в этом опросе"})
            cur.execute(f"DELETE FROM {SCHEMA}.poll_votes WHERE poll_id = %s AND user_id = %s", (poll_id, my_user_id))
            for oid in wanted:
                cur.execute(f"INSERT INTO {SCHEMA}.poll_votes (poll_id, option_id, user_id) VALUES (%s, %s, %s)", (poll_id, oid, my_user_id))
            conn.commit()
            return reply(200, {"poll": load_poll(cur, poll_id, my_user_id)})

        # POST /chats?action=close-poll — закрыть опрос (автор, администратор или владелец)
        if method == "POST" and action == "close-poll":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            poll_id = body.get("poll_id")
            if not isinstance(poll_id, int):
                return reply(400, {"error": "Нужен poll_id"})
            cur.execute(f"SELECT chat_id, created_by FROM {SCHEMA}.polls WHERE id = %s", (poll_id,))
            p = cur.fetchone()
            if not p:
                return reply(404, {"error": "Опрос не найден"})
            role = get_role(cur, p[0], my_user_id)
            if role is None:
                return reply(403, {"error": "Нет доступа к опросу"})
            if p[1] != my_user_id and role not in ("owner", "admin"):
                return reply(403, {"error": "Закрыть опрос может автор или администратор"})
            cur.execute(f"UPDATE {SCHEMA}.polls SET closed = true WHERE id = %s", (poll_id,))
            conn.commit()
            return reply(200, {"poll": load_poll(cur, poll_id, my_user_id)})

        # GET /chats?action=poll-voters&poll_id=X — кто как проголосовал (не анонимно, как в группе)
        if method == "GET" and action == "poll-voters":
            try:
                poll_id = int(params.get("poll_id"))
            except (TypeError, ValueError):
                return reply(400, {"error": "Нужен poll_id"})
            if not can_access_poll(cur, poll_id, my_user_id, params.get("code")):
                return reply(403, {"error": "Нет доступа к опросу"})
            cur.execute(f"""
                SELECT v.option_id, u.id, u.display_name, u.avatar_initials, u.avatar_color, u.avatar_url
                FROM {SCHEMA}.poll_votes v JOIN {SCHEMA}.users u ON u.id = v.user_id
                WHERE v.poll_id = %s ORDER BY v.created_at
            """, (poll_id,))
            by_option: dict = {}
            for oid, uid, name, ini, color, url in cur.fetchall():
                by_option.setdefault(oid, []).append({"id": uid, "displayName": name, "avatarInitials": ini, "avatarColor": color, "avatarUrl": url})
            return reply(200, {"voters": by_option})

        # GET /chats?action=stickers-favorite — мои избранные стикеры
        if method == "GET" and action == "stickers-favorite":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            cur.execute(f"SELECT sticker FROM {SCHEMA}.favorite_stickers WHERE user_id = %s ORDER BY created_at DESC", (my_user_id,))
            return reply(200, {"stickers": [r[0] for r in cur.fetchall()]})

        # POST /chats?action=stickers-toggle — добавить стикер в избранное или убрать
        if method == "POST" and action == "stickers-toggle":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            sticker = body.get("sticker")
            if not isinstance(sticker, str) or not STICKER_RE.match(sticker):
                return reply(400, {"error": "Некорректный стикер"})
            cur.execute(f"SELECT 1 FROM {SCHEMA}.favorite_stickers WHERE user_id = %s AND sticker = %s", (my_user_id, sticker))
            if cur.fetchone():
                cur.execute(f"DELETE FROM {SCHEMA}.favorite_stickers WHERE user_id = %s AND sticker = %s", (my_user_id, sticker))
                favorite = False
            else:
                cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.favorite_stickers WHERE user_id = %s", (my_user_id,))
                if cur.fetchone()[0] >= 60:
                    return reply(400, {"error": "В избранном уже 60 стикеров. Уберите лишние"})
                cur.execute(f"INSERT INTO {SCHEMA}.favorite_stickers (user_id, sticker) VALUES (%s, %s)", (my_user_id, sticker))
                favorite = True
            conn.commit()
            return reply(200, {"favorite": favorite})

        # GET /chats?action=profile&user_id=X — краткий профиль человека
        if method == "GET" and action == "profile":
            try:
                target = int(params.get("user_id"))
            except (TypeError, ValueError):
                return reply(400, {"error": "Нужен user_id"})
            cur.execute(f"""
                SELECT u.id, u.display_name, u.login, u.avatar_initials, u.avatar_color, u.avatar_url,
                       u.mood_emoji, u.mood_text, u.bio, u.show_online,
                       EXTRACT(EPOCH FROM (NOW() - u.last_seen))
                FROM {SCHEMA}.users u WHERE u.id = %s
            """, (target,))
            u = cur.fetchone()
            if not u:
                return reply(404, {"error": "Пользователь не найден"})
            cur.execute(f"""
                SELECT 1 FROM {SCHEMA}.chat_members a JOIN {SCHEMA}.chat_members b ON b.chat_id = a.chat_id
                WHERE a.user_id = %s AND b.user_id = %s LIMIT 1
            """, (my_user_id, target))
            if target != my_user_id and not cur.fetchone():
                return reply(403, {"error": "Профиль доступен тем, с кем у вас есть общий чат"})
            cur.execute(f"""
                SELECT c.id, c.name FROM {SCHEMA}.chats c
                JOIN {SCHEMA}.chat_members a ON a.chat_id = c.id AND a.user_id = %s
                JOIN {SCHEMA}.chat_members b ON b.chat_id = c.id AND b.user_id = %s
                WHERE c.is_group ORDER BY c.name LIMIT 20
            """, (my_user_id, target))
            common = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
            cur.execute(f"""
                SELECT c.id FROM {SCHEMA}.chats c
                JOIN {SCHEMA}.chat_members a ON a.chat_id = c.id AND a.user_id = %s
                JOIN {SCHEMA}.chat_members b ON b.chat_id = c.id AND b.user_id = %s
                WHERE NOT c.is_group LIMIT 1
            """, (my_user_id, target))
            direct = cur.fetchone()
            seen = float(u[10]) if u[10] is not None else None
            return reply(200, {"profile": {
                "id": u[0], "displayName": u[1], "login": u[2], "avatarInitials": u[3], "avatarColor": u[4], "avatarUrl": u[5],
                "moodEmoji": u[6] or "", "moodText": u[7] or "", "bio": u[8] or "",
                "statusText": status_text(seen) if u[9] else "",
                "online": bool(u[9]) and is_online(seen),
                "commonGroups": common,
                "directChatId": direct[0] if direct else None,
                "isMe": target == my_user_id,
            }})

        # POST /chats?action=update-mood — моё настроение и «о себе»
        if method == "POST" and action == "update-mood":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            emoji = clean_text(body.get("moodEmoji"), 8)
            text = clean_text(body.get("moodText"), 80)
            bio = clean_text(body.get("bio"), 200)
            if emoji and not MOOD_EMOJI_RE.match(emoji):
                return reply(400, {"error": "В поле настроения подойдёт один эмодзи"})
            cur.execute(f"""
                UPDATE {SCHEMA}.users SET mood_emoji = %s, mood_text = %s, bio = %s WHERE id = %s
            """, (emoji or None, text or None, bio or None, my_user_id))
            conn.commit()
            return reply(200, {"moodEmoji": emoji, "moodText": text, "bio": bio})

        # GET /chats?action=search-senders — люди из моих чатов для фильтра поиска
        if method == "GET" and action == "search-senders":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            cur.execute(f"""
                SELECT DISTINCT u.id, u.display_name
                FROM {SCHEMA}.chat_members me
                JOIN {SCHEMA}.chat_members cm ON cm.chat_id = me.chat_id
                JOIN {SCHEMA}.users u ON u.id = cm.user_id
                WHERE me.user_id = %s AND u.id != %s
                ORDER BY u.display_name LIMIT 300
            """, (my_user_id, my_user_id))
            return reply(200, {"senders": [{"id": r[0], "name": r[1]} for r in cur.fetchall()]})

        # GET /chats?action=search-messages&q=слово[&chat_id=][&sender_id=][&date_from=][&date_to=][&tz=] — поиск по моим чатам
        if method == "GET" and action == "search-messages":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            q = clean_text(params.get("q"), 100)
            conds = []
            args: list = [my_user_id, my_user_id]
            has_filter = False
            if params.get("chat_id"):
                try:
                    conds.append("m.chat_id = %s")
                    args.append(int(params["chat_id"]))
                    has_filter = True
                except ValueError:
                    return reply(400, {"error": "Некорректный чат"})
            if params.get("sender_id"):
                try:
                    sender = int(params["sender_id"])
                except ValueError:
                    return reply(400, {"error": "Некорректный отправитель"})
                conds.append("m.sender_id = %s")
                args.append(sender)
                has_filter = True
            try:
                tz = max(-840, min(840, int(params.get("tz") or 0)))
            except ValueError:
                tz = 0
            for key, op, shift in (("date_from", ">=", 0), ("date_to", "<", 1)):
                raw = params.get(key)
                if not raw:
                    continue
                try:
                    day = datetime.strptime(raw, "%Y-%m-%d") + timedelta(days=shift)
                except ValueError:
                    return reply(400, {"error": "Некорректная дата"})
                conds.append(f"m.created_at {op} %s")
                args.append(day - timedelta(minutes=tz))
                has_filter = True
            if len(q) < 2 and not has_filter:
                return reply(200, {"results": [], "query": q})
            needle = q.lower()
            extra = (" AND " + " AND ".join(conds)) if conds else ""
            cur.execute(f"""
                SELECT m.id, m.chat_id, m.topic_id, m.text, m.sender_id, u.display_name,
                       TO_CHAR(m.created_at + (%s || ' minutes')::interval, 'DD.MM.YYYY HH24:MI'),
                       c.is_group, c.name, ct.name, m.kind
                FROM {SCHEMA}.messages m
                JOIN {SCHEMA}.chat_members cm ON cm.chat_id = m.chat_id AND cm.user_id = %s
                JOIN {SCHEMA}.chats c ON c.id = m.chat_id
                LEFT JOIN {SCHEMA}.users u ON u.id = m.sender_id
                LEFT JOIN {SCHEMA}.chat_topics ct ON ct.id = m.topic_id
                WHERE m.removed_at IS NULL
                  AND NOT EXISTS (SELECT 1 FROM {SCHEMA}.hidden_messages h WHERE h.message_id = m.id AND h.user_id = %s)
                  {extra}
                ORDER BY m.created_at DESC
                LIMIT 4000
            """, [str(tz)] + args)
            found = []
            for r in cur.fetchall():
                text = r[3] or ""
                if text.startswith("/stickers/") or "/stickers/user/" in text:
                    continue
                if needle:
                    idx = text.lower().find(needle)
                    if idx < 0:
                        continue
                    start = max(0, idx - 50)
                    end = min(len(text), idx + len(needle) + 90)
                    snippet = ("…" if start > 0 else "") + text[start:end] + ("…" if end < len(text) else "")
                else:
                    if r[10] in ("voice", "circle"):
                        snippet = "🎤 Голосовое сообщение" if r[10] == "voice" else "⭕ Видеосообщение"
                    elif r[10] == "image" and not text:
                        snippet = "🖼 Фото"
                    elif r[10] == "file" and not text:
                        snippet = "📎 Файл"
                    elif not text:
                        continue
                    else:
                        snippet = text[:160] + ("…" if len(text) > 160 else "")
                found.append((r, snippet))
                if len(found) >= 40:
                    break
            chat_ids = sorted({r[1] for r, _ in found})
            partner_names: dict = {}
            if chat_ids:
                cur.execute(f"""
                    SELECT cm.chat_id, u.display_name FROM {SCHEMA}.chat_members cm
                    JOIN {SCHEMA}.users u ON u.id = cm.user_id
                    WHERE cm.chat_id = ANY(%s) AND cm.user_id != %s
                """, (chat_ids, my_user_id))
                for cid, name in cur.fetchall():
                    partner_names.setdefault(cid, name)
            results = []
            for r, snippet in found:
                is_group = bool(r[7])
                results.append({
                    "messageId": r[0],
                    "chatId": r[1],
                    "topicId": r[2],
                    "topicName": r[9],
                    "chatName": (r[8] if is_group else partner_names.get(r[1], r[8])) or "Чат",
                    "isGroup": is_group,
                    "senderName": "Вы" if r[4] == my_user_id else (r[5] or ""),
                    "snippet": snippet,
                    "time": r[6],
                })
            return reply(200, {"results": results, "query": q})

        # POST /chats?action=bulk-delete — удалить сообщения: свои у всех, чужие только у меня
        if method == "POST" and action == "bulk-delete":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            ids = int_list(body.get("message_ids"))
            if not ids:
                return reply(400, {"error": "Выберите сообщения"})
            cur.execute(f"""
                SELECT m.id, m.sender_id FROM {SCHEMA}.messages m
                JOIN {SCHEMA}.chat_members cm ON cm.chat_id = m.chat_id AND cm.user_id = %s
                WHERE m.id = ANY(%s) AND m.removed_at IS NULL
            """, (my_user_id, ids))
            rows = cur.fetchall()
            own = [r[0] for r in rows if r[1] == my_user_id]
            others = [r[0] for r in rows if r[1] != my_user_id]
            if own:
                cur.execute(f"UPDATE {SCHEMA}.messages SET removed_at = NOW() WHERE id = ANY(%s) AND sender_id = %s", (own, my_user_id))
            for mid in others:
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.hidden_messages (user_id, message_id) VALUES (%s, %s)
                    ON CONFLICT (user_id, message_id) DO NOTHING
                """, (my_user_id, mid))
            conn.commit()
            return reply(200, {"ok": True, "removed": own, "hidden": others})

        # POST /chats?action=schedule-message — запланировать текст, фото или файл (стикер это текст с путём)
        if method == "POST" and action == "schedule-message":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            chat_id = body.get("chat_id")
            kind = body.get("kind") or "text"
            text = clean_text(body.get("text"), 4000)
            send_at = str(body.get("send_at") or "")
            if not isinstance(chat_id, int) or kind not in ("text", "image", "file"):
                return reply(400, {"error": "Некорректные данные"})
            if kind == "text" and not text:
                return reply(400, {"error": "Напишите текст сообщения"})
            if kind != "text" and not body.get("media"):
                return reply(400, {"error": "Не передан файл"})
            if not is_member(cur, chat_id, my_user_id):
                return reply(403, {"error": "Нет доступа к чату"})
            topic_id = body.get("topic_id")
            if topic_id:
                cur.execute(f"SELECT 1 FROM {SCHEMA}.chat_topics WHERE id = %s AND chat_id = %s", (topic_id, chat_id))
                if not cur.fetchone():
                    return reply(400, {"error": "Тема не найдена"})
            else:
                topic_id = None
            when = parse_send_at(send_at)
            if when is None:
                return reply(400, {"error": "Не удалось разобрать дату и время"})
            now_utc = utc_now_naive()
            if when <= now_utc + timedelta(seconds=20):
                return reply(400, {"error": "Выберите время в будущем"})
            if when > now_utc + timedelta(days=366):
                return reply(400, {"error": "Можно запланировать не дальше чем на год"})
            cur.execute(f"""
                SELECT COUNT(*) FROM {SCHEMA}.scheduled_messages
                WHERE sender_id = %s AND status = 'pending'
            """, (my_user_id,))
            if cur.fetchone()[0] >= MAX_SCHEDULED:
                return reply(400, {"error": f"Не больше {MAX_SCHEDULED} запланированных сообщений"})
            media_url = None
            file_name = None
            file_size = None
            if kind != "text":
                raw = str(body.get("media") or "")
                if "," in raw:
                    raw = raw.split(",", 1)[1]
                try:
                    data = base64.b64decode(raw, validate=False)
                except Exception:
                    return reply(400, {"error": "Не удалось прочитать файл"})
                if not data:
                    return reply(400, {"error": "Пустой файл"})
                if len(data) > SCHEDULED_FILE_MAX_BYTES:
                    return reply(413, {"error": "Файл слишком большой (лимит 8 МБ)"})
                file_name = clean_text(body.get("fileName"), 200) or None
                ctype = str(body.get("contentType") or "application/octet-stream")[:100]
                ext = "bin"
                if file_name and "." in file_name:
                    cand = file_name.rsplit(".", 1)[-1].lower()
                    if cand.isalnum() and len(cand) <= 8:
                        ext = cand
                elif kind == "image":
                    ext = "jpg"
                try:
                    media_url = save_file(f"messages/{kind}/{uuid.uuid4().hex}.{ext}", data, ctype)
                except Exception as e:
                    print(f"schedule upload failed: {type(e).__name__}: {e}")
                    return reply(400, {"error": "Не удалось загрузить файл"})
                file_size = len(data)
            cur.execute(f"""
                INSERT INTO {SCHEMA}.scheduled_messages
                    (chat_id, topic_id, sender_id, text, send_at, kind, media_url, file_name, file_size)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, EXTRACT(EPOCH FROM send_at)
            """, (chat_id, topic_id, my_user_id, text, when, kind, media_url, file_name, file_size))
            sid, epoch = cur.fetchone()
            conn.commit()
            return reply(200, {"item": scheduled_item(sid, chat_id, topic_id, text, epoch, kind, media_url, file_name)})

        # GET /chats?action=list-scheduled&chat_id=X — мои запланированные сообщения в чате
        if method == "GET" and action == "list-scheduled":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            try:
                chat_id = int(params.get("chat_id"))
            except (TypeError, ValueError):
                return reply(400, {"error": "Нужен chat_id"})
            cur.execute(f"""
                SELECT id, topic_id, text, EXTRACT(EPOCH FROM send_at), kind, media_url, file_name
                FROM {SCHEMA}.scheduled_messages
                WHERE sender_id = %s AND chat_id = %s AND status = 'pending'
                ORDER BY send_at ASC LIMIT 50
            """, (my_user_id, chat_id))
            items = [scheduled_item(r[0], chat_id, r[1], r[2], r[3], r[4], r[5], r[6]) for r in cur.fetchall()]
            return reply(200, {"items": items})

        # POST /chats?action=edit-scheduled — изменить текст (подпись) и время запланированного сообщения
        if method == "POST" and action == "edit-scheduled":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            sid = body.get("id")
            if not isinstance(sid, int):
                return reply(400, {"error": "Нужен id"})
            cur.execute(f"""
                SELECT chat_id, topic_id, text, EXTRACT(EPOCH FROM send_at), kind, media_url, file_name
                FROM {SCHEMA}.scheduled_messages
                WHERE id = %s AND sender_id = %s AND status = 'pending' FOR UPDATE
            """, (sid, my_user_id))
            row = cur.fetchone()
            if not row:
                return reply(404, {"error": "Сообщение уже отправлено или отменено"})
            new_text = row[2]
            if "text" in body:
                new_text = clean_text(body.get("text"), 4000)
                is_sticker = row[4] == "text" and STICKER_ANY_RE.match(row[2] or "")
                if row[4] == "text" and not new_text:
                    return reply(400, {"error": "Текст не может быть пустым"})
                if is_sticker:
                    new_text = row[2]
            new_when = None
            if body.get("send_at"):
                new_when = parse_send_at(str(body.get("send_at")))
                if new_when is None:
                    return reply(400, {"error": "Не удалось разобрать дату и время"})
                now_utc = utc_now_naive()
                if new_when <= now_utc + timedelta(seconds=20):
                    return reply(400, {"error": "Выберите время в будущем"})
                if new_when > now_utc + timedelta(days=366):
                    return reply(400, {"error": "Можно запланировать не дальше чем на год"})
            if new_when is not None:
                cur.execute(f"UPDATE {SCHEMA}.scheduled_messages SET text = %s, send_at = %s WHERE id = %s", (new_text, new_when, sid))
            else:
                cur.execute(f"UPDATE {SCHEMA}.scheduled_messages SET text = %s WHERE id = %s", (new_text, sid))
            conn.commit()
            cur.execute(f"SELECT EXTRACT(EPOCH FROM send_at) FROM {SCHEMA}.scheduled_messages WHERE id = %s", (sid,))
            epoch = cur.fetchone()[0]
            return reply(200, {"item": scheduled_item(sid, row[0], row[1], new_text, epoch, row[4], row[5], row[6])})

        # POST /chats?action=cancel-scheduled — отменить запланированное сообщение
        if method == "POST" and action == "cancel-scheduled":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            sid = body.get("id")
            if not isinstance(sid, int):
                return reply(400, {"error": "Нужен id"})
            cur.execute(f"""
                UPDATE {SCHEMA}.scheduled_messages SET status = 'cancelled'
                WHERE id = %s AND sender_id = %s AND status = 'pending' RETURNING id
            """, (sid, my_user_id))
            done = cur.fetchone()
            conn.commit()
            if not done:
                return reply(404, {"error": "Сообщение уже отправлено или отменено"})
            return reply(200, {"ok": True})

        # GET /chats?action=sticker-packs — мои наборы стикеров
        if method == "GET" and action == "sticker-packs":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            cur.execute(f"SELECT id, title FROM {SCHEMA}.sticker_packs WHERE user_id = %s ORDER BY id", (my_user_id,))
            packs = [{"id": r[0], "title": r[1], "stickers": []} for r in cur.fetchall()]
            by_id = {p["id"]: p for p in packs}
            if by_id:
                cur.execute(f"""
                    SELECT id, pack_id, url FROM {SCHEMA}.custom_stickers
                    WHERE pack_id = ANY(%s) ORDER BY id
                """, (list(by_id.keys()),))
                for sid, pid, url in cur.fetchall():
                    by_id[pid]["stickers"].append({"id": sid, "url": url})
            return reply(200, {"packs": packs})

        # POST /chats?action=create-sticker-pack — новый набор
        if method == "POST" and action == "create-sticker-pack":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            title = clean_text(body.get("title"), 40)
            if not title:
                return reply(400, {"error": "Назовите набор"})
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.sticker_packs WHERE user_id = %s", (my_user_id,))
            if cur.fetchone()[0] >= MAX_PACKS:
                return reply(400, {"error": f"Не больше {MAX_PACKS} наборов"})
            cur.execute(f"INSERT INTO {SCHEMA}.sticker_packs (user_id, title) VALUES (%s, %s) RETURNING id", (my_user_id, title))
            pid = cur.fetchone()[0]
            conn.commit()
            return reply(200, {"pack": {"id": pid, "title": title, "stickers": []}})

        # POST /chats?action=delete-sticker-pack — удалить набор целиком
        if method == "POST" and action == "delete-sticker-pack":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            pid = body.get("pack_id")
            if not isinstance(pid, int):
                return reply(400, {"error": "Нужен pack_id"})
            cur.execute(f"SELECT 1 FROM {SCHEMA}.sticker_packs WHERE id = %s AND user_id = %s", (pid, my_user_id))
            if not cur.fetchone():
                return reply(404, {"error": "Набор не найден"})
            cur.execute(f"DELETE FROM {SCHEMA}.custom_stickers WHERE pack_id = %s", (pid,))
            cur.execute(f"DELETE FROM {SCHEMA}.sticker_packs WHERE id = %s", (pid,))
            conn.commit()
            return reply(200, {"ok": True})

        # POST /chats?action=add-sticker — загрузить картинку в набор
        if method == "POST" and action == "add-sticker":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            pid = body.get("pack_id")
            if not isinstance(pid, int):
                return reply(400, {"error": "Нужен pack_id"})
            cur.execute(f"SELECT 1 FROM {SCHEMA}.sticker_packs WHERE id = %s AND user_id = %s", (pid, my_user_id))
            if not cur.fetchone():
                return reply(404, {"error": "Набор не найден"})
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.custom_stickers WHERE pack_id = %s", (pid,))
            if cur.fetchone()[0] >= MAX_STICKERS_PER_PACK:
                return reply(400, {"error": f"В наборе уже {MAX_STICKERS_PER_PACK} стикеров"})
            try:
                data, ctype, ext = decode_image(body, CUSTOM_STICKER_MAX_BYTES)
            except ValueError as e:
                return reply(400, {"error": str(e)})
            url = save_file(f"stickers/user/{uuid.uuid4().hex}.{ext}", data, ctype)
            cur.execute(f"INSERT INTO {SCHEMA}.custom_stickers (pack_id, url) VALUES (%s, %s) RETURNING id", (pid, url))
            sid = cur.fetchone()[0]
            conn.commit()
            return reply(200, {"sticker": {"id": sid, "url": url}})

        # POST /chats?action=delete-sticker — убрать стикер из набора
        if method == "POST" and action == "delete-sticker":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            sid = body.get("sticker_id")
            if not isinstance(sid, int):
                return reply(400, {"error": "Нужен sticker_id"})
            cur.execute(f"""
                DELETE FROM {SCHEMA}.custom_stickers s USING {SCHEMA}.sticker_packs p
                WHERE s.id = %s AND s.pack_id = p.id AND p.user_id = %s RETURNING s.id
            """, (sid, my_user_id))
            done = cur.fetchone()
            conn.commit()
            if not done:
                return reply(404, {"error": "Стикер не найден"})
            return reply(200, {"ok": True})

        # POST /chats?action=share-poll — переслать опрос в другую группу (голоса общие)
        if method == "POST" and action == "share-poll":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            poll_id = body.get("poll_id")
            target = body.get("target_chat_id")
            if not isinstance(poll_id, int) or not isinstance(target, int):
                return reply(400, {"error": "Нужны poll_id и target_chat_id"})
            if not can_access_poll(cur, poll_id, my_user_id):
                return reply(403, {"error": "Нет доступа к опросу"})
            if not is_group_chat(cur, target):
                return reply(400, {"error": "Опрос можно переслать только в группу"})
            if not is_member(cur, target, my_user_id):
                return reply(403, {"error": "Вы не участник этой группы"})
            cur.execute(f"SELECT question, chat_id FROM {SCHEMA}.polls WHERE id = %s", (poll_id,))
            question, origin_chat = cur.fetchone()
            cur.execute(f"""
                SELECT 1 FROM {SCHEMA}.polls WHERE id = %s AND chat_id = %s
                UNION ALL SELECT 1 FROM {SCHEMA}.poll_shares WHERE poll_id = %s AND chat_id = %s
            """, (poll_id, target, poll_id, target))
            if cur.fetchone():
                return reply(409, {"error": "Этот опрос уже есть в выбранной группе"})
            cur.execute(f"""
                INSERT INTO {SCHEMA}.messages (chat_id, sender_id, text, is_read, kind)
                VALUES (%s, %s, %s, false, 'text') RETURNING id, TO_CHAR(created_at, 'HH24:MI')
            """, (target, my_user_id, "📊 " + question))
            mid, mtime = cur.fetchone()
            cur.execute(f"""
                INSERT INTO {SCHEMA}.poll_shares (message_id, poll_id, chat_id, created_by)
                VALUES (%s, %s, %s, %s)
            """, (mid, poll_id, target, my_user_id))
            conn.commit()
            poll = load_poll(cur, poll_id, my_user_id)
            poll["messageId"] = mid
            return reply(200, {"messageId": mid, "time": mtime, "text": "📊 " + question, "poll": poll})

        # POST /chats?action=poll-link — ссылка на опрос для голосования новыми участниками
        if method == "POST" and action == "poll-link":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            poll_id = body.get("poll_id")
            if not isinstance(poll_id, int) or not can_access_poll(cur, poll_id, my_user_id):
                return reply(403, {"error": "Нет доступа к опросу"})
            cur.execute(f"SELECT share_code FROM {SCHEMA}.polls WHERE id = %s", (poll_id,))
            code = cur.fetchone()[0]
            if not code:
                code = uuid.uuid4().hex[:16]
                cur.execute(f"UPDATE {SCHEMA}.polls SET share_code = %s WHERE id = %s AND share_code IS NULL", (code, poll_id))
                conn.commit()
                cur.execute(f"SELECT share_code FROM {SCHEMA}.polls WHERE id = %s", (poll_id,))
                code = cur.fetchone()[0]
            return reply(200, {"code": code})

        # GET /chats?action=poll-by-code&code=X — опрос по ссылке
        if method == "GET" and action == "poll-by-code":
            if not authed:
                return reply(401, {"error": "Нужна авторизация"})
            code = clean_text(params.get("code"), 24)
            cur.execute(f"SELECT id, chat_id FROM {SCHEMA}.polls WHERE share_code = %s", (code,))
            row = cur.fetchone()
            if not row or not code:
                return reply(404, {"error": "Опрос по этой ссылке не найден"})
            poll = load_poll(cur, row[0], my_user_id)
            cur.execute(f"SELECT name FROM {SCHEMA}.chats WHERE id = %s", (row[1],))
            chat_row = cur.fetchone()
            return reply(200, {"poll": poll, "chatName": chat_row[0] if chat_row else None})

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
                                WHEN m.kind = 'text' AND (m.text ~ '^/stickers/[a-z]+/[a-z0-9-]+[.]png$' OR m.text ~ '/stickers/user/[a-f0-9]{32}[.](png|webp|jpg)$') THEN '🖼 Стикер'
                                WHEN EXISTS (SELECT 1 FROM {SCHEMA}.polls pp WHERE pp.message_id = m.id) THEN m.text
                                ELSE m.text END
                    FROM {SCHEMA}.messages m
                    WHERE m.chat_id = c.id
                      AND NOT EXISTS (SELECT 1 FROM {SCHEMA}.hidden_messages h WHERE h.message_id = m.id AND h.user_id = %(me)s)
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
                      AND NOT EXISTS (SELECT 1 FROM {SCHEMA}.hidden_messages h WHERE h.message_id = m.id AND h.user_id = %(me)s)
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
                c.avatar_url, c.description, cm_me.role, cm_me.chat_bg,
                o.mood_emoji, o.mood_text, o.bio
            FROM {SCHEMA}.chats c
            JOIN {SCHEMA}.chat_members cm_me ON cm_me.chat_id = c.id AND cm_me.user_id = %(me)s
            LEFT JOIN {SCHEMA}.messages pm ON pm.id = c.pinned_message_id AND pm.removed_at IS NULL
            LEFT JOIN {SCHEMA}.users pu ON pu.id = pm.sender_id
            LEFT JOIN LATERAL (
                SELECT u.id, u.display_name, u.avatar_color, u.avatar_initials, u.avatar_url,
                       CASE WHEN u.show_online THEN u.last_seen ELSE NULL END AS last_seen,
                       cm.typing_until, u.show_typing, u.mood_emoji, u.mood_text, u.bio
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
                "moodEmoji": "" if is_group else (r[27] or ""),
                "moodText": "" if is_group else (r[28] or ""),
                "bio": "" if is_group else (r[29] or ""),
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
                    "poll": pinned_poll(cur, r[16], my_user_id),
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