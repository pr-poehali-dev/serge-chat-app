"""Отправка нового сообщения в чат мессенджера Трынделка"""
import json
import os
import psycopg2

SCHEMA = "t_p64541051_serge_chat_app"
DEFAULT_USER_ID = 1

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


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    chat_id = body.get("chat_id")
    text = (body.get("text") or "").strip()

    if not chat_id or not text:
        return {
            "statusCode": 400,
            "headers": CORS,
            "body": json.dumps({"error": "chat_id и text обязательны"}),
        }

    conn = get_conn()
    cur = conn.cursor()
    try:
        my_user_id = resolve_user_id(cur, event.get("headers") or {})
        cur.execute(f"""
            INSERT INTO {SCHEMA}.messages (chat_id, sender_id, text, is_read)
            VALUES (%s, %s, %s, false)
            RETURNING id, TO_CHAR(created_at, 'HH24:MI')
        """, (chat_id, my_user_id, text))
        row = cur.fetchone()
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
                "reactions": {},
            }),
        }
    finally:
        cur.close()
        conn.close()