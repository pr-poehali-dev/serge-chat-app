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
            messages = []
            for r in rows:
                messages.append({
                    "id": r[0],
                    "text": r[1],
                    "sender_id": r[2],
                    "out": r[2] == my_user_id,
                    "read": r[3],
                    "time": r[4],
                    "reactions": reactions_by_msg.get(r[0], {}),
                })
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"messages": messages})}

        # POST /chats?action=toggle-reaction — поставить/убрать эмодзи-реакцию на сообщение
        if method == "POST" and params.get("action") == "toggle-reaction":
            body = json.loads(event.get("body") or "{}")
            message_id = body.get("message_id")
            emoji = (body.get("emoji") or "").strip()
            if not message_id or not emoji:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не переданы message_id или emoji"})}

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

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"added": added, "reactions": reactions})}

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

        # GET /chats?action=members&chat_id=X — список участников группы
        if method == "GET" and params.get("action") == "members":
            chat_id = int(params["chat_id"])
            cur.execute(f"""
                SELECT u.id, u.display_name, u.avatar_initials, u.avatar_color, u.avatar_url
                FROM {SCHEMA}.users u
                JOIN {SCHEMA}.chat_members cm ON cm.user_id = u.id
                WHERE cm.chat_id = %s
                ORDER BY u.display_name
            """, (chat_id,))
            rows = cur.fetchall()
            members = [{
                "id": r[0], "displayName": r[1], "avatarInitials": r[2],
                "avatarColor": r[3], "avatarUrl": r[4],
            } for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"members": members})}

        # POST /chats?action=add-member — добавить участника в группу
        if method == "POST" and params.get("action") == "add-member":
            body = json.loads(event.get("body") or "{}")
            chat_id = body.get("chat_id")
            user_id = body.get("user_id")
            cur.execute(f"SELECT is_group FROM {SCHEMA}.chats WHERE id = %s", (chat_id,))
            chat_row = cur.fetchone()
            if not chat_row or not chat_row[0]:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Чат не найден или не является группой"})}
            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_members (chat_id, user_id)
                VALUES (%s, %s)
                ON CONFLICT (chat_id, user_id) DO NOTHING
            """, (chat_id, user_id))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # POST /chats?action=start-chat — создать (или найти существующий) личный чат с пользователем
        if method == "POST" and params.get("action") == "start-chat":
            body = json.loads(event.get("body") or "{}")
            other_user_id = body.get("user_id")
            if not other_user_id or other_user_id == my_user_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректный пользователь"})}

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
                    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Пользователь не найден"})}
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

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"chat_id": chat_id})}

        # POST /chats?action=remove-member — удалить участника из группы
        if method == "POST" and params.get("action") == "remove-member":
            body = json.loads(event.get("body") or "{}")
            chat_id = body.get("chat_id")
            user_id = body.get("user_id")
            cur.execute(f"""
                DELETE FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s
            """, (chat_id, user_id))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

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
                cm_me.pinned as pinned,
                (
                    SELECT u.avatar_url FROM {SCHEMA}.users u
                    JOIN {SCHEMA}.chat_members cm ON cm.user_id = u.id
                    WHERE cm.chat_id = c.id AND u.id != %s
                    LIMIT 1
                ) as contact_avatar_url
            FROM {SCHEMA}.chats c
            JOIN {SCHEMA}.chat_members cm_me ON cm_me.chat_id = c.id AND cm_me.user_id = %s
            ORDER BY (
                SELECT m.created_at FROM {SCHEMA}.messages m
                WHERE m.chat_id = c.id
                ORDER BY m.created_at DESC LIMIT 1
            ) DESC NULLS LAST
        """, (my_user_id, my_user_id, my_user_id, my_user_id, my_user_id))

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
                "avatarUrl": r[10] if not r[2] else None,
            })

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"chats": chats})}

    finally:
        cur.close()
        conn.close()