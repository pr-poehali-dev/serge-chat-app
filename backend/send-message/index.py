"""Отправка сообщений (текст, голосовое, видеокружок, фото, файлы, ответы) в чат мессенджера Трынделка"""
import base64
import json
import os
import re
import uuid
from datetime import datetime, timezone

import boto3
import psycopg2

SCHEMA = "t_p64541051_serge_chat_app"
DEFAULT_USER_ID = 1
MAX_MEDIA_BYTES = 6 * 1024 * 1024
MAX_FILE_BYTES = 8 * 1024 * 1024
KINDS = ("text", "voice", "circle", "image", "file")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def resolve_user_id(cur, headers: dict) -> int:
    session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
    if not session_id:
        return DEFAULT_USER_ID
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE session_id = %s", (session_id,))
    row = cur.fetchone()
    if not row:
        raise PermissionError("session_expired")
    return row[0]


def ext_for(content_type: str, kind: str, file_name: str = "") -> str:
    if kind in ("image", "file") and "." in (file_name or ""):
        ext = file_name.rsplit(".", 1)[-1].lower()
        if ext.isalnum() and len(ext) <= 8:
            return ext
    ct = (content_type or "").lower()
    if kind == "image":
        for key, ext in (("png", "png"), ("jpeg", "jpg"), ("jpg", "jpg"), ("gif", "gif"), ("webp", "webp"), ("heic", "heic")):
            if key in ct:
                return ext
        return "jpg"
    if kind == "file":
        return "bin"
    if "mp4" in ct or "m4a" in ct or "aac" in ct:
        return "mp4" if kind == "circle" else "m4a"
    if "ogg" in ct:
        return "ogg"
    if "mpeg" in ct:
        return "mp3"
    return "webm"


def save_file(key: str, data: bytes, content_type: str) -> str:
    local_dir = os.environ.get("LOCAL_STORAGE_DIR")
    if local_dir:
        path = os.path.join(local_dir, key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)
        return f"{os.environ.get('PUBLIC_FILES_URL', '/files').rstrip('/')}/{key}"
    s3 = boto3.client(
        "s3",
        endpoint_url=os.environ.get("S3_ENDPOINT", "https://bucket.poehali.dev"),
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket=os.environ.get("S3_BUCKET", "files"), Key=key, Body=data, ContentType=content_type)
    public_base = os.environ.get("PUBLIC_FILES_URL") or f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket"
    return f"{public_base.rstrip('/')}/{key}"


def upload_media(kind: str, data_b64: str, content_type: str, file_name: str = "") -> tuple:
    if "," in data_b64:
        data_b64 = data_b64.split(",", 1)[1]
    data = base64.b64decode(data_b64)
    limit = MAX_FILE_BYTES if kind in ("image", "file") else MAX_MEDIA_BYTES
    if len(data) > limit:
        raise ValueError("Файл слишком большой")
    key = f"messages/{kind}/{uuid.uuid4().hex}.{ext_for(content_type, kind, file_name)}"
    url = save_file(key, data, content_type or "application/octet-stream")
    return url, len(data)


def preview_for(kind: str, text: str, file_name: str) -> str:
    if kind == "voice":
        return "🎤 Голосовое сообщение"
    if kind == "circle":
        return "⭕ Видеосообщение"
    if kind == "image":
        return "🖼 Фото"
    if kind == "file":
        return "📎 " + (file_name or "Файл")
    if text and (text.lower().endswith(".gif") and " " not in text.strip()):
        return "🎞 GIF"
    if text and (re.match(r"^/stickers/(v2/)?[a-z]+/[a-z0-9-]+\.(png|webp)$", text) or re.search(r"/stickers/user/[a-f0-9]{32}\.(png|webp|jpg)$", text)):
        return "🖼 Стикер"
    return (text or "Новое сообщение")[:140]


def in_quiet_hours(now_utc, start: int, end: int, tz_minutes: int) -> bool:
    """Попадает ли сейчас (по местному времени пользователя) время в тихие часы, в том числе через полночь"""
    local = (now_utc.hour * 60 + now_utc.minute + (tz_minutes or 0)) % 1440
    if start == end:
        return False
    if start < end:
        return start <= local < end
    return local >= start or local < end


def notify_members(conn, cur, chat_id: int, sender_id: int, topic_id, kind: str, text: str, file_name: str, message_id: int) -> None:
    cur.execute(f"""
        SELECT c.is_group, c.name, u.display_name
        FROM {SCHEMA}.chats c, {SCHEMA}.users u
        WHERE c.id = %s AND u.id = %s
    """, (chat_id, sender_id))
    info = cur.fetchone()
    if not info:
        return
    is_group, chat_name, sender_name = info
    handles = set()
    if is_group and kind == "text" and text and "@" in text:
        handles = {h.lower().rstrip(".-") for h in re.findall(r"(?<![\w@])@([\w.\-]{2,40})", text)}
    cur.execute(f"""
        SELECT cm.user_id, u.quiet_enabled, u.quiet_from, u.quiet_to, u.quiet_tz, cm.notify_enabled,
               LOWER(COALESCE(NULLIF(u.login, ''), u.username))
        FROM {SCHEMA}.chat_members cm
        JOIN {SCHEMA}.users u ON u.id = cm.user_id
        WHERE cm.chat_id = %s AND cm.user_id != %s
    """, (chat_id, sender_id))
    now_utc = datetime.now(timezone.utc)
    targets = []
    quiet_targets = []
    mention_targets = []
    mention_quiet = []
    for uid, q_on, q_from, q_to, q_tz, notify_on, handle in cur.fetchall():
        quiet = bool(q_on and in_quiet_hours(now_utc, q_from, q_to, q_tz))
        if handle and handle in handles:
            (mention_quiet if quiet else mention_targets).append(uid)
        elif notify_on is not False:
            (quiet_targets if quiet else targets).append(uid)
    if not targets and not quiet_targets and not mention_targets and not mention_quiet:
        return
    body = preview_for(kind, text, file_name)
    if is_group:
        title = chat_name or "Группа"
        body = f"{sender_name}: {body}"
    else:
        title = sender_name
    import push_utils
    payload = {
        "type": "message",
        "title": title,
        "body": body,
        "chatId": chat_id,
        "topicId": topic_id,
        "messageId": message_id,
        "tag": f"chat-{chat_id}",
    }
    if targets:
        push_utils.send_to_users(conn, targets, payload)
    if quiet_targets:
        push_utils.send_to_users(conn, quiet_targets, {**payload, "silent": True})
    if mention_targets or mention_quiet:
        mention_payload = {
            **payload,
            "title": f"{sender_name} упомянул(а) вас",
            "body": f"{chat_name or 'Группа'}: {preview_for(kind, text, file_name)}",
            "tag": f"mention-{message_id}",
            "mention": True,
        }
        if mention_targets:
            push_utils.send_to_users(conn, mention_targets, mention_payload)
        if mention_quiet:
            push_utils.send_to_users(conn, mention_quiet, {**mention_payload, "silent": True})


def dispatch_due() -> dict:
    """Отправляет запланированные сообщения, время которых наступило, и рассылает уведомления"""
    conn = get_conn()
    cur = conn.cursor()
    sent = []
    try:
        cur.execute(f"""
            SELECT id, chat_id, topic_id, sender_id, text, kind, media_url, file_name, file_size
            FROM {SCHEMA}.scheduled_messages
            WHERE status = 'pending' AND send_at <= %s
            ORDER BY send_at LIMIT 30 FOR UPDATE SKIP LOCKED
        """, (datetime.now(timezone.utc).replace(tzinfo=None),))
        rows = cur.fetchall()
        for sid, chat_id, topic_id, sender_id, text, kind, media_url, file_name, file_size in rows:
            cur.execute(f"SELECT 1 FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s", (chat_id, sender_id))
            if not cur.fetchone():
                cur.execute(f"UPDATE {SCHEMA}.scheduled_messages SET status = 'failed' WHERE id = %s", (sid,))
                continue
            if topic_id:
                cur.execute(f"SELECT 1 FROM {SCHEMA}.chat_topics WHERE id = %s AND chat_id = %s", (topic_id, chat_id))
                if not cur.fetchone():
                    topic_id = None
            kind = kind or "text"
            cur.execute(f"""
                INSERT INTO {SCHEMA}.messages (chat_id, sender_id, text, is_read, kind, topic_id, media_url, file_name, file_size)
                VALUES (%s, %s, %s, false, %s, %s, %s, %s, %s) RETURNING id
            """, (chat_id, sender_id, text, kind, topic_id, media_url, file_name, file_size))
            mid = cur.fetchone()[0]
            cur.execute(f"UPDATE {SCHEMA}.scheduled_messages SET status = 'sent', message_id = %s WHERE id = %s", (mid, sid))
            sent.append((chat_id, sender_id, topic_id, text, mid, kind, file_name or ""))
        conn.commit()
        for chat_id, sender_id, topic_id, text, mid, kind, fname in sent:
            try:
                notify_members(conn, cur, chat_id, sender_id, topic_id, kind, text, fname, mid)
            except Exception as e:
                print(f"notify scheduled failed: {type(e).__name__}: {e}")
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"sent": len(sent)})}
    finally:
        cur.close()
        conn.close()


def handler(event: dict, context) -> dict:
    """Сохраняет новое сообщение: текст, голосовое, видеокружок, фото или файл, с ответом на другое сообщение"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    if body.get("action") == "dispatch-due":
        return dispatch_due()
    chat_id = body.get("chat_id")
    kind = body.get("kind") or "text"
    text = (body.get("text") or "").strip()
    media_b64 = body.get("media")

    file_name = (body.get("fileName") or "").strip()[:200] or None
    forward_of = body.get("forward_message_id")

    if not chat_id or kind not in KINDS:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "chat_id и text обязательны"})}
    if kind == "text" and not text and not forward_of:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "chat_id и text обязательны"})}
    if kind != "text" and not media_b64 and not forward_of:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нет медиафайла"})}

    media_url = None
    file_size = None
    if kind != "text" and not forward_of:
        try:
            media_url, file_size = upload_media(kind, media_b64, body.get("contentType") or "", file_name or "")
        except ValueError as e:
            return {"statusCode": 413, "headers": CORS, "body": json.dumps({"error": str(e)})}
        except Exception as e:
            print(f"upload failed: {type(e).__name__}: {e}")
            if "402" in str(e) or "Payment Required" in str(e):
                return {"statusCode": 402, "headers": CORS, "body": json.dumps({"error": "Хранилище файлов сейчас недоступно: проверьте тариф проекта", "code": "storage_unavailable"})}
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не удалось загрузить файл"})}

    duration = body.get("duration")
    duration = int(duration) if isinstance(duration, (int, float)) else None

    topic_id = body.get("topic_id")
    reply_to_id = body.get("reply_to_id")

    conn = get_conn()
    cur = conn.cursor()
    try:
        try:
            my_user_id = resolve_user_id(cur, event.get("headers") or {})
        except PermissionError:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия истекла, войдите заново", "code": "session_expired"})}

        cur.execute(
            f"SELECT 1 FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s",
            (chat_id, my_user_id),
        )
        if not cur.fetchone():
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Вы не участник этого чата"})}

        if topic_id:
            cur.execute(
                f"SELECT 1 FROM {SCHEMA}.chat_topics WHERE id = %s AND chat_id = %s",
                (topic_id, chat_id),
            )
            if not cur.fetchone():
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Тема не найдена"})}
        else:
            topic_id = None

        forwarded_from = None
        if forward_of:
            cur.execute(f"""
                SELECT m.text, m.kind, m.media_url, m.duration_sec, m.file_name, m.file_size,
                       m.removed_at, m.forwarded_from, u.display_name
                FROM {SCHEMA}.messages m
                LEFT JOIN {SCHEMA}.users u ON u.id = m.sender_id
                WHERE m.id = %s
                  AND EXISTS (SELECT 1 FROM {SCHEMA}.chat_members cm
                              WHERE cm.chat_id = m.chat_id AND cm.user_id = %s)
            """, (forward_of, my_user_id))
            src = cur.fetchone()
            if not src or src[6] is not None:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Исходное сообщение недоступно"})}
            text = src[0] or ""
            kind = src[1] or "text"
            media_url = src[2]
            duration = src[3]
            file_name = src[4]
            file_size = src[5]
            forwarded_from = (src[7] or src[8] or "Пользователь")[:200]
            topic_id = topic_id if topic_id else None

        reply = None
        if reply_to_id and not forward_of:
            cur.execute(f"""
                SELECT m.id, m.text, m.kind, m.file_name, m.removed_at, u.display_name
                FROM {SCHEMA}.messages m
                LEFT JOIN {SCHEMA}.users u ON u.id = m.sender_id
                WHERE m.id = %s AND m.chat_id = %s
            """, (reply_to_id, chat_id))
            r = cur.fetchone()
            if not r:
                reply_to_id = None
            else:
                reply = {
                    "id": r[0],
                    "text": "" if r[4] else (r[1] or r[3] or ""),
                    "kind": r[2] or "text",
                    "senderName": r[5],
                    "removed": r[4] is not None,
                }
        else:
            reply_to_id = None

        cur.execute(f"""
            INSERT INTO {SCHEMA}.messages
                (chat_id, sender_id, text, is_read, kind, media_url, duration_sec, topic_id, reply_to_id, file_name, file_size, forwarded_from)
            VALUES (%s, %s, %s, false, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, TO_CHAR(created_at, 'HH24:MI')
        """, (chat_id, my_user_id, text, kind, media_url, duration, topic_id, reply_to_id, file_name, file_size, forwarded_from))
        row = cur.fetchone()
        cur.execute(f"""
            UPDATE {SCHEMA}.chat_members SET typing_until = NULL
            WHERE chat_id = %s AND user_id = %s
        """, (chat_id, my_user_id))
        cur.execute(f"UPDATE {SCHEMA}.users SET last_seen = NOW(), is_online = true WHERE id = %s", (my_user_id,))
        conn.commit()

        try:
            notify_members(conn, cur, chat_id, my_user_id, topic_id, kind, text, file_name or "", row[0])
        except Exception as e:
            print(f"notify failed: {type(e).__name__}: {e}")

        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({
                "id": row[0],
                "time": row[1],
                "out": True,
                "read": False,
                "text": text,
                "sender_id": my_user_id,
                "kind": kind,
                "mediaUrl": media_url,
                "duration": duration,
                "transcript": None,
                "fileName": file_name,
                "fileSize": file_size,
                "replyTo": reply,
                "forwardedFrom": forwarded_from,
                "edited": False,
                "reactions": {},
            }),
        }
    finally:
        cur.close()
        conn.close()
