"""Отправка нового сообщения в чат мессенджера Серж"""
import json
import os
import psycopg2

SCHEMA = "t_p64541051_serge_chat_app"
MY_USER_ID = 1

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


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
        cur.execute(f"""
            INSERT INTO {SCHEMA}.messages (chat_id, sender_id, text, is_read)
            VALUES (%s, %s, %s, false)
            RETURNING id, TO_CHAR(created_at, 'HH24:MI')
        """, (chat_id, MY_USER_ID, text))
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
                "sender_id": MY_USER_ID,
            }),
        }
    finally:
        cur.close()
        conn.close()
