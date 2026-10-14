"""Голосовые и видеозвонки между двумя пользователями: вызов, ответ, отклонение, завершение, длительность"""
import json
import os

import psycopg2

import push_utils

SCHEMA = "t_p64541051_serge_chat_app"
ACTIONS = ("config", "incoming", "start", "state", "answer", "decline", "end", "ping")
RING_TIMEOUT_SEC = 45
PING_TIMEOUT_SEC = 20

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}

COLUMNS = """id, chat_id, caller_id, callee_id, is_video, status, offer, answer,
             EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - answered_at))::int,
             EXTRACT(EPOCH FROM (NOW() - created_at))::int,
             EXTRACT(EPOCH FROM (NOW() - caller_ping))::int,
             EXTRACT(EPOCH FROM (NOW() - callee_ping))::int"""


def reply(status: int, payload: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(payload)}


def duration_label(seconds: int) -> str:
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def finish(conn, cur, call_id: int, status: str, reason: str) -> None:
    """Завершает звонок один раз и оставляет запись о нём в переписке"""
    cur.execute(f"""
        UPDATE {SCHEMA}.calls SET status = %s, end_reason = %s, ended_at = NOW()
        WHERE id = %s AND status IN ('ringing', 'active')
        RETURNING chat_id, caller_id, is_video, answered_at IS NOT NULL,
                  EXTRACT(EPOCH FROM (NOW() - answered_at))::int
    """, (status, reason, call_id))
    row = cur.fetchone()
    if not row:
        conn.commit()
        return
    chat_id, caller_id, is_video, was_answered, seconds = row
    icon = "📹" if is_video else "📞"
    kind_label = "Видеозвонок" if is_video else "Звонок"
    if was_answered:
        text = f"{icon} {kind_label} · {duration_label(seconds or 0)}"
    elif status == "declined":
        text = f"{icon} {kind_label} отклонён"
    else:
        text = f"{icon} Пропущенный {'видеозвонок' if is_video else 'звонок'}"
    cur.execute(f"""
        INSERT INTO {SCHEMA}.messages (chat_id, sender_id, text, is_read, kind)
        VALUES (%s, %s, %s, false, 'text')
    """, (chat_id, caller_id, text))
    conn.commit()


def refresh(conn, cur, call_id: int):
    """Читает звонок и закрывает его, если вызов не взяли или пропала связь"""
    cur.execute(f"SELECT {COLUMNS} FROM {SCHEMA}.calls WHERE id = %s", (call_id,))
    row = cur.fetchone()
    if not row:
        return None
    status = row[5]
    if status == "ringing" and row[9] > RING_TIMEOUT_SEC:
        finish(conn, cur, call_id, "missed", "timeout")
    elif status == "active" and (row[10] > PING_TIMEOUT_SEC or row[11] > PING_TIMEOUT_SEC):
        finish(conn, cur, call_id, "ended", "lost")
    else:
        return row
    cur.execute(f"SELECT {COLUMNS} FROM {SCHEMA}.calls WHERE id = %s", (call_id,))
    return cur.fetchone()


def peer_info(cur, user_id: int) -> dict:
    cur.execute(f"""
        SELECT display_name, avatar_initials, avatar_color, avatar_url
        FROM {SCHEMA}.users WHERE id = %s
    """, (user_id,))
    r = cur.fetchone()
    if not r:
        return {"name": "Пользователь", "avatar": "??", "color": "#a855f7", "avatarUrl": None}
    return {"name": r[0], "avatar": r[1], "color": r[2], "avatarUrl": r[3]}


def call_payload(cur, row, me: int) -> dict:
    other = row[3] if row[2] == me else row[2]
    return {
        "id": row[0],
        "chatId": row[1],
        "isVideo": bool(row[4]),
        "status": row[5],
        "incoming": row[3] == me,
        "peer": peer_info(cur, other),
        "seconds": row[8] if row[8] is not None and row[5] in ("active", "ended") else 0,
    }


def ice_servers() -> list:
    servers = [{"urls": ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]}]
    turn_url = os.environ.get("TURN_URL")
    if turn_url:
        servers.append({
            "urls": [u.strip() for u in turn_url.split(",") if u.strip()],
            "username": os.environ.get("TURN_USER", ""),
            "credential": os.environ.get("TURN_PASSWORD", ""),
        })
    return servers


def handler(event: dict, context) -> dict:
    """Сигнализация звонков: создать вызов, получить входящий, ответить, отклонить, завершить, сообщить о связи"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    headers = event.get("headers") or {}
    action = params.get("action")
    body = json.loads(event.get("body") or "{}") if method == "POST" else {}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    try:
        session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
        me = None
        if session_id:
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE session_id = %s", (session_id,))
            r = cur.fetchone()
            me = r[0] if r else None
        if me is None:
            return reply(401, {"error": "Нужна авторизация"})

        if method == "GET" and action == "config":
            return reply(200, {"iceServers": ice_servers()})

        if method == "GET" and action == "incoming":
            cur.execute(f"""
                SELECT id FROM {SCHEMA}.calls
                WHERE callee_id = %s AND status = 'ringing'
                ORDER BY created_at DESC LIMIT 1
            """, (me,))
            r = cur.fetchone()
            if not r:
                return reply(200, {"call": None})
            row = refresh(conn, cur, r[0])
            if not row or row[5] != "ringing":
                return reply(200, {"call": None})
            payload = call_payload(cur, row, me)
            payload["offer"] = row[6]
            return reply(200, {"call": payload})

        if method == "POST" and action == "start":
            chat_id = body.get("chat_id")
            offer = body.get("offer")
            if not isinstance(chat_id, int) or not offer:
                return reply(400, {"error": "Нужны chat_id и offer"})
            cur.execute(f"SELECT is_group FROM {SCHEMA}.chats WHERE id = %s", (chat_id,))
            c = cur.fetchone()
            if not c:
                return reply(404, {"error": "Чат не найден"})
            if c[0]:
                return reply(400, {"error": "Звонки доступны только в личных чатах"})
            cur.execute(
                f"SELECT user_id FROM {SCHEMA}.chat_members WHERE chat_id = %s ORDER BY user_id",
                (chat_id,),
            )
            members = [x[0] for x in cur.fetchall()]
            if me not in members or len(members) != 2:
                return reply(403, {"error": "Нет доступа к чату"})
            callee = members[0] if members[1] == me else members[1]

            cur.execute(f"""
                SELECT id FROM {SCHEMA}.calls
                WHERE status IN ('ringing', 'active')
                  AND (caller_id = ANY(%s) OR callee_id = ANY(%s))
            """, ([me, callee], [me, callee]))
            busy = [x[0] for x in cur.fetchall()]
            for call_id in busy:
                refresh(conn, cur, call_id)
            cur.execute(f"""
                SELECT 1 FROM {SCHEMA}.calls
                WHERE status IN ('ringing', 'active')
                  AND (caller_id = ANY(%s) OR callee_id = ANY(%s)) LIMIT 1
            """, ([me, callee], [me, callee]))
            if cur.fetchone():
                return reply(409, {"error": "Линия занята: идёт другой звонок", "code": "busy"})

            cur.execute(f"""
                INSERT INTO {SCHEMA}.calls (chat_id, caller_id, callee_id, is_video, offer)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (chat_id, me, callee, bool(body.get("isVideo")), json.dumps(offer) if not isinstance(offer, str) else offer))
            call_id = cur.fetchone()[0]
            conn.commit()

            caller = peer_info(cur, me)
            try:
                push_utils.send_to_users(conn, [callee], {
                    "type": "call",
                    "title": caller["name"],
                    "body": "Входящий видеозвонок" if body.get("isVideo") else "Входящий звонок",
                    "chatId": chat_id,
                    "callId": call_id,
                    "tag": f"call-{call_id}",
                }, ttl=40, urgency="high")
            except Exception as e:
                print(f"call push failed: {type(e).__name__}: {e}")
            return reply(200, {"callId": call_id})

        if action in ("state", "answer", "decline", "end", "ping"):
            call_id = body.get("call_id") if method == "POST" else params.get("call_id")
            try:
                call_id = int(call_id)
            except (TypeError, ValueError):
                return reply(400, {"error": "Нужен call_id"})
            row = refresh(conn, cur, call_id)
            if not row or me not in (row[2], row[3]):
                return reply(404, {"error": "Звонок не найден"})
            is_caller = row[2] == me

            if method == "POST" and action == "answer":
                if row[3] != me:
                    return reply(403, {"error": "Отвечать может только вызываемый"})
                answer = body.get("answer")
                if not answer:
                    return reply(400, {"error": "Нужен answer"})
                cur.execute(f"""
                    UPDATE {SCHEMA}.calls
                    SET status = 'active', answer = %s, answered_at = NOW(), caller_ping = NOW(), callee_ping = NOW()
                    WHERE id = %s AND status = 'ringing'
                """, (json.dumps(answer) if not isinstance(answer, str) else answer, call_id))
                conn.commit()
                if cur.rowcount == 0:
                    return reply(409, {"error": "Звонок уже завершён", "code": "gone"})
                return reply(200, {"ok": True})

            if method == "POST" and action == "decline":
                if row[5] == "ringing":
                    finish(conn, cur, call_id, "canceled" if is_caller else "declined", "user")
                return reply(200, {"ok": True})

            if method == "POST" and action == "end":
                if row[5] == "ringing":
                    finish(conn, cur, call_id, "canceled" if is_caller else "declined", "user")
                elif row[5] == "active":
                    finish(conn, cur, call_id, "ended", "user")
                return reply(200, {"ok": True})

            column = "caller_ping" if is_caller else "callee_ping"
            if row[5] == "active" or (is_caller and row[5] == "ringing"):
                cur.execute(f"UPDATE {SCHEMA}.calls SET {column} = NOW() WHERE id = %s", (call_id,))
                conn.commit()
            row = refresh(conn, cur, call_id)
            payload = call_payload(cur, row, me)
            if is_caller and row[5] == "active":
                payload["answer"] = row[7]
            return reply(200, {"call": payload})

        return reply(404, {"error": "Неизвестное действие"})
    finally:
        cur.close()
        conn.close()
