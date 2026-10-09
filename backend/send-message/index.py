"""Отправка сообщений (текст, голосовое, видеокружок) в чат мессенджера Трынделка"""
import base64
import json
import os
import uuid

import boto3
import psycopg2

SCHEMA = "t_p64541051_serge_chat_app"
DEFAULT_USER_ID = 1
MAX_MEDIA_BYTES = 6 * 1024 * 1024

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


def ext_for(content_type: str, kind: str) -> str:
    ct = (content_type or "").lower()
    if "mp4" in ct or "m4a" in ct or "aac" in ct:
        return "mp4" if kind == "circle" else "m4a"
    if "ogg" in ct:
        return "ogg"
    if "mpeg" in ct:
        return "mp3"
    return "webm"


def upload_media(kind: str, data_b64: str, content_type: str) -> str:
    if "," in data_b64:
        data_b64 = data_b64.split(",", 1)[1]
    data = base64.b64decode(data_b64)
    if len(data) > MAX_MEDIA_BYTES:
        raise ValueError("Файл слишком большой")
    key = f"messages/{kind}/{uuid.uuid4().hex}.{ext_for(content_type, kind)}"
    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType=content_type or "application/octet-stream")
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def handler(event: dict, context) -> dict:
    """Сохраняет новое сообщение: текст, голосовое или видеокружок"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    chat_id = body.get("chat_id")
    kind = body.get("kind") or "text"
    text = (body.get("text") or "").strip()
    media_b64 = body.get("media")

    if not chat_id or kind not in ("text", "voice", "circle"):
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "chat_id и text обязательны"})}
    if kind == "text" and not text:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "chat_id и text обязательны"})}
    if kind != "text" and not media_b64:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нет медиафайла"})}

    media_url = None
    if kind != "text":
        try:
            media_url = upload_media(kind, media_b64, body.get("contentType") or "")
        except ValueError as e:
            return {"statusCode": 413, "headers": CORS, "body": json.dumps({"error": str(e)})}

    duration = body.get("duration")
    duration = int(duration) if isinstance(duration, (int, float)) else None

    topic_id = body.get("topic_id")

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

        cur.execute(f"""
            INSERT INTO {SCHEMA}.messages (chat_id, sender_id, text, is_read, kind, media_url, duration_sec, topic_id)
            VALUES (%s, %s, %s, false, %s, %s, %s, %s)
            RETURNING id, TO_CHAR(created_at, 'HH24:MI')
        """, (chat_id, my_user_id, text, kind, media_url, duration, topic_id))
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
                "reactions": {},
            }),
        }
    finally:
        cur.close()
        conn.close()