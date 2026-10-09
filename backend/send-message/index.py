"""Отправка сообщений (текст, голосовое, видеокружок, фото, файлы, ответы) в чат мессенджера Трынделка"""
import base64
import json
import os
import uuid

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
    return row[0] if row else DEFAULT_USER_ID


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


def upload_media(kind: str, data_b64: str, content_type: str, file_name: str = "") -> tuple:
    if "," in data_b64:
        data_b64 = data_b64.split(",", 1)[1]
    data = base64.b64decode(data_b64)
    limit = MAX_FILE_BYTES if kind in ("image", "file") else MAX_MEDIA_BYTES
    if len(data) > limit:
        raise ValueError("Файл слишком большой")
    key = f"messages/{kind}/{uuid.uuid4().hex}.{ext_for(content_type, kind, file_name)}"
    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType=content_type or "application/octet-stream")
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}", len(data)


def handler(event: dict, context) -> dict:
    """Сохраняет новое сообщение: текст, голосовое, видеокружок, фото или файл, с ответом на другое сообщение"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
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
        my_user_id = resolve_user_id(cur, event.get("headers") or {})

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