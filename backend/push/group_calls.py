import json
import os

import psycopg2

import push_utils

SCHEMA = "t_p64541051_serge_chat_app"
ACTIONS = ("gcall-start", "gcall-join", "gcall-poll", "gcall-signal", "gcall-leave", "gcall-active")
MAX_PARTICIPANTS = 6
PING_TIMEOUT_SEC = 20
SIGNAL_KINDS = ("offer", "answer", "ice")
MAX_PAYLOAD = 20000

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}


def reply(status: int, payload: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(payload)}


def duration_label(seconds: int) -> str:
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def active_members(cur, call_id: int) -> list:
    cur.execute(f"""
        SELECT m.user_id, u.display_name, u.avatar_initials, u.avatar_color, u.avatar_url,
               EXTRACT(EPOCH FROM m.joined_at)
        FROM {SCHEMA}.group_call_members m
        JOIN {SCHEMA}.users u ON u.id = m.user_id
        WHERE m.call_id = %s AND m.left_at IS NULL
          AND m.last_ping > NOW() - INTERVAL '{PING_TIMEOUT_SEC} seconds'
        ORDER BY m.joined_at
    """, (call_id,))
    return [
        {"userId": r[0], "name": r[1], "avatar": r[2], "color": r[3], "avatarUrl": r[4], "joinedAt": float(r[5])}
        for r in cur.fetchall()
    ]


def refresh(conn, cur, call_id: int):
    """Закрывает звонок, когда в нём никого не осталось, и оставляет запись в переписке"""
    cur.execute(f"""
        UPDATE {SCHEMA}.group_call_members SET left_at = NOW()
        WHERE call_id = %s AND left_at IS NULL AND last_ping <= NOW() - INTERVAL '{PING_TIMEOUT_SEC} seconds'
    """, (call_id,))
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.group_call_members WHERE call_id = %s AND left_at IS NULL", (call_id,))
    remaining = cur.fetchone()[0]
    if remaining == 0:
        cur.execute(f"""
            UPDATE {SCHEMA}.group_calls SET status = 'ended', ended_at = NOW()
            WHERE id = %s AND status = 'active'
            RETURNING chat_id, started_by, is_video, EXTRACT(EPOCH FROM (NOW() - created_at))::int
        """, (call_id,))
        row = cur.fetchone()
        if row:
            cur.execute(f"SELECT COUNT(DISTINCT user_id) FROM {SCHEMA}.group_call_members WHERE call_id = %s", (call_id,))
            people = cur.fetchone()[0]
            icon = "📹" if row[2] else "📞"
            label = "Групповой видеозвонок" if row[2] else "Групповой звонок"
            cur.execute(f"""
                INSERT INTO {SCHEMA}.messages (chat_id, sender_id, text, is_read, kind)
                VALUES (%s, %s, %s, false, 'text')
            """, (row[0], row[1], f"{icon} {label} · {duration_label(row[3])} · участников: {people}"))
    conn.commit()
    cur.execute(f"""
        SELECT id, chat_id, is_video, status, EXTRACT(EPOCH FROM (NOW() - created_at))::int
        FROM {SCHEMA}.group_calls WHERE id = %s
    """, (call_id,))
    return cur.fetchone()


def is_chat_member(cur, chat_id: int, user_id: int) -> bool:
    cur.execute(f"SELECT 1 FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s", (chat_id, user_id))
    return cur.fetchone() is not None


def handler(event: dict, context, cur, conn, me: int, params: dict, body: dict) -> dict:
    action = params.get("action")
    method = event.get("httpMethod", "GET")

    if method == "GET" and action == "gcall-active":
        try:
            chat_id = int(params.get("chat_id"))
        except (TypeError, ValueError):
            return reply(400, {"error": "Нужен chat_id"})
        if not is_chat_member(cur, chat_id, me):
            return reply(403, {"error": "Нет доступа к чату"})
        cur.execute(f"SELECT id FROM {SCHEMA}.group_calls WHERE chat_id = %s AND status = 'active' ORDER BY id DESC LIMIT 1", (chat_id,))
        r = cur.fetchone()
        if not r:
            return reply(200, {"call": None})
        row = refresh(conn, cur, r[0])
        if not row or row[3] != "active":
            return reply(200, {"call": None})
        return reply(200, {"call": {"id": row[0], "chatId": row[1], "isVideo": bool(row[2]), "participants": active_members(cur, row[0])}})

    if method != "POST":
        return reply(404, {"error": "Неизвестное действие"})

    if action == "gcall-start":
        chat_id = body.get("chat_id")
        if not isinstance(chat_id, int):
            return reply(400, {"error": "Нужен chat_id"})
        cur.execute(f"SELECT is_group FROM {SCHEMA}.chats WHERE id = %s", (chat_id,))
        c = cur.fetchone()
        if not c or not c[0]:
            return reply(400, {"error": "Групповые звонки доступны только в группах"})
        if not is_chat_member(cur, chat_id, me):
            return reply(403, {"error": "Нет доступа к чату"})

        cur.execute(f"SELECT id FROM {SCHEMA}.group_calls WHERE chat_id = %s AND status = 'active'", (chat_id,))
        for (old_id,) in cur.fetchall():
            refresh(conn, cur, old_id)
        cur.execute(f"SELECT id, is_video FROM {SCHEMA}.group_calls WHERE chat_id = %s AND status = 'active' LIMIT 1", (chat_id,))
        existing = cur.fetchone()
        if existing:
            return reply(409, {"error": "В этой группе уже идёт звонок", "code": "exists", "callId": existing[0], "isVideo": bool(existing[1])})

        cur.execute(f"""
            INSERT INTO {SCHEMA}.group_calls (chat_id, started_by, is_video) VALUES (%s, %s, %s) RETURNING id
        """, (chat_id, me, bool(body.get("isVideo"))))
        call_id = cur.fetchone()[0]
        cur.execute(f"INSERT INTO {SCHEMA}.group_call_members (call_id, user_id) VALUES (%s, %s)", (call_id, me))
        conn.commit()

        try:
            cur.execute(f"SELECT name FROM {SCHEMA}.chats WHERE id = %s", (chat_id,))
            chat_name = (cur.fetchone() or ["Группа"])[0] or "Группа"
            cur.execute(f"SELECT display_name FROM {SCHEMA}.users WHERE id = %s", (me,))
            starter = cur.fetchone()[0]
            cur.execute(f"""
                SELECT user_id FROM {SCHEMA}.chat_members
                WHERE chat_id = %s AND user_id != %s AND notify_enabled = true
            """, (chat_id, me))
            targets = [r[0] for r in cur.fetchall()]
            push_utils.send_to_users(conn, targets, {
                "type": "group-call",
                "title": chat_name,
                "body": f"{starter} начал(а) {'видеозвонок' if body.get('isVideo') else 'звонок'}",
                "chatId": chat_id,
                "callId": call_id,
                "tag": f"gcall-{call_id}",
            }, ttl=60, urgency="high")
        except Exception as e:
            print(f"group call push failed: {type(e).__name__}: {e}")
        return reply(200, {"callId": call_id, "isVideo": bool(body.get("isVideo")), "members": active_members(cur, call_id)})

    try:
        call_id = int(body.get("call_id"))
    except (TypeError, ValueError):
        return reply(400, {"error": "Нужен call_id"})

    row = refresh(conn, cur, call_id)
    if not row:
        return reply(404, {"error": "Звонок не найден"})
    if not is_chat_member(cur, row[1], me):
        return reply(403, {"error": "Нет доступа к звонку"})

    if action == "gcall-join":
        if row[3] != "active":
            return reply(409, {"error": "Звонок уже завершён", "code": "gone"})
        members = active_members(cur, call_id)
        already = any(m["userId"] == me for m in members)
        if not already and len(members) >= MAX_PARTICIPANTS:
            return reply(409, {"error": f"В звонке уже {MAX_PARTICIPANTS} участников — это максимум", "code": "full"})
        cur.execute(f"DELETE FROM {SCHEMA}.group_call_signals WHERE call_id = %s AND (to_user = %s OR from_user = %s)", (call_id, me, me))
        cur.execute(f"""
            INSERT INTO {SCHEMA}.group_call_members (call_id, user_id) VALUES (%s, %s)
            ON CONFLICT (call_id, user_id) DO UPDATE SET joined_at = NOW(), last_ping = NOW(), left_at = NULL
        """, (call_id, me))
        conn.commit()
        return reply(200, {"callId": call_id, "isVideo": bool(row[2]), "members": active_members(cur, call_id), "seconds": row[4]})

    if action == "gcall-signal":
        if row[3] != "active":
            return reply(409, {"error": "Звонок уже завершён", "code": "gone"})
        items = body.get("signals")
        if not isinstance(items, list) or len(items) > 60:
            return reply(400, {"error": "Некорректные сигналы"})
        members = {m["userId"] for m in active_members(cur, call_id)}
        if me not in members:
            return reply(403, {"error": "Вы не участвуете в звонке"})
        saved = 0
        for it in items:
            to_user = it.get("to_user")
            kind = it.get("kind")
            payload = it.get("payload")
            if to_user not in members or to_user == me or kind not in SIGNAL_KINDS or payload is None:
                continue
            text = payload if isinstance(payload, str) else json.dumps(payload)
            if len(text) > MAX_PAYLOAD:
                continue
            cur.execute(f"""
                INSERT INTO {SCHEMA}.group_call_signals (call_id, from_user, to_user, kind, payload)
                VALUES (%s, %s, %s, %s, %s)
            """, (call_id, me, to_user, kind, text))
            saved += 1
        conn.commit()
        return reply(200, {"ok": True, "saved": saved})

    if action == "gcall-poll":
        if row[3] != "active":
            return reply(200, {"status": row[3], "members": [], "signals": [], "seconds": row[4]})
        cur.execute(f"""
            UPDATE {SCHEMA}.group_call_members SET last_ping = NOW()
            WHERE call_id = %s AND user_id = %s AND left_at IS NULL
        """, (call_id, me))
        if cur.rowcount == 0:
            conn.commit()
            return reply(200, {"status": "left", "members": [], "signals": [], "seconds": row[4]})
        cur.execute(f"""
            UPDATE {SCHEMA}.group_call_signals SET delivered = true
            WHERE call_id = %s AND to_user = %s AND delivered = false
            RETURNING id, from_user, kind, payload
        """, (call_id, me))
        signals = sorted(
            [{"id": r[0], "from": r[1], "kind": r[2], "payload": r[3]} for r in cur.fetchall()],
            key=lambda x: x["id"],
        )
        cur.execute(f"DELETE FROM {SCHEMA}.group_call_signals WHERE call_id = %s AND delivered = true AND created_at < NOW() - INTERVAL '2 minutes'", (call_id,))
        conn.commit()
        return reply(200, {"status": "active", "members": active_members(cur, call_id), "signals": signals, "seconds": row[4]})

    if action == "gcall-leave":
        cur.execute(f"""
            UPDATE {SCHEMA}.group_call_members SET left_at = NOW()
            WHERE call_id = %s AND user_id = %s AND left_at IS NULL
        """, (call_id, me))
        conn.commit()
        refresh(conn, cur, call_id)
        return reply(200, {"ok": True})

    return reply(404, {"error": "Неизвестное действие"})
