"""Получение списка чатов и сообщений для мессенджера Трынделка"""
import json
import os
import psycopg2

SCHEMA = "t_p64541051_serge_chat_app"
DEFAULT_USER_ID = 1  # Гостевой демо-пользователь, если сессия не передана

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

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    headers = event.get("headers") or {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        my_user_id = resolve_user_id(cur, headers)

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
                    "out": r[2] == my_user_id,
                    "read": r[3],
                    "time": r[4],
                })
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"messages": messages})}

        # POST /chats?action=pin — закрепить/открепить чат
        if method == "POST" and params.get("action") == "pin":
            body = json.loads(event.get("body") or "{}")
            chat_id = body.get("chat_id")
            pinned = bool(body.get("pinned"))
            cur.execute(f"""
                UPDATE {SCHEMA}.chat_members SET pinned = %s
                WHERE chat_id = %s AND user_id = %s
            """, (pinned, chat_id, my_user_id))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"pinned": pinned})}

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
                ) as contact_initials,
                cm_me.pinned as pinned
            FROM {SCHEMA}.chats c
            JOIN {SCHEMA}.chat_members cm_me ON cm_me.chat_id = c.id AND cm_me.user_id = %s
            ORDER BY (
                SELECT m.created_at FROM {SCHEMA}.messages m
                WHERE m.chat_id = c.id
                ORDER BY m.created_at DESC LIMIT 1
            ) DESC NULLS LAST
        """, (my_user_id, my_user_id, my_user_id, my_user_id))

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
                "pinned": bool(r[9]) if r[9] is not None else False,
            })

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"chats": chats})}

    finally:
        cur.close()
        conn.close()
