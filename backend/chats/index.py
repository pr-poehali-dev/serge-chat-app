"""Получение списка чатов и сообщений для мессенджера Серж"""
import json
import os
import psycopg2

SCHEMA = "t_p64541051_serge_chat_app"
MY_USER_ID = 1  # Текущий пользователь (демо)

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

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET /chats?action=messages&chat_id=X — сообщения чата
        if method == "GET" and params.get("action") == "messages":
            chat_id = int(params["chat_id"])
            cur.execute(f"""
                SELECT m.id, m.text, m.sender_id, m.is_read,
                       TO_CHAR(m.created_at, 'HH24:MI') as time_str,
                       m.created_at
                FROM {SCHEMA}.messages m
                WHERE m.chat_id = %s
                ORDER BY m.created_at ASC
            """, (chat_id,))
            rows = cur.fetchall()
            messages = []
            for r in rows:
                messages.append({
                    "id": r[0],
                    "text": r[1],
                    "sender_id": r[2],
                    "out": r[2] == MY_USER_ID,
                    "read": r[3],
                    "time": r[4],
                })
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"messages": messages})}

        # GET /chats — список чатов
        cur.execute(f"""
            SELECT
                c.id,
                c.name,
                c.is_group,
                c.avatar_color,
                (
                    SELECT m.text FROM {SCHEMA}.messages m
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
                    WHERE m.chat_id = c.id AND m.is_read = false AND m.sender_id != %s
                ) as unread_count,
                (
                    SELECT u.is_online FROM {SCHEMA}.users u
                    JOIN {SCHEMA}.chat_members cm ON cm.user_id = u.id
                    WHERE cm.chat_id = c.id AND u.id != %s
                    LIMIT 1
                ) as contact_online,
                (
                    SELECT u.avatar_initials FROM {SCHEMA}.users u
                    JOIN {SCHEMA}.chat_members cm ON cm.user_id = u.id
                    WHERE cm.chat_id = c.id AND u.id != %s
                    LIMIT 1
                ) as contact_initials
            FROM {SCHEMA}.chats c
            JOIN {SCHEMA}.chat_members cm ON cm.chat_id = c.id
            WHERE cm.user_id = %s
            ORDER BY (
                SELECT m.created_at FROM {SCHEMA}.messages m
                WHERE m.chat_id = c.id
                ORDER BY m.created_at DESC LIMIT 1
            ) DESC NULLS LAST
        """, (MY_USER_ID, MY_USER_ID, MY_USER_ID, MY_USER_ID))

        rows = cur.fetchall()
        chats = []
        for r in rows:
            chats.append({
                "id": r[0],
                "name": r[1],
                "isGroup": r[2],
                "color": r[3],
                "lastMsg": r[4] or "",
                "time": r[5] or "",
                "unread": int(r[6]) if r[6] else 0,
                "online": bool(r[7]) if r[7] is not None else False,
                "avatar": r[8] or r[1][:2].upper() if r[1] else "??",
            })

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"chats": chats})}

    finally:
        cur.close()
        conn.close()
