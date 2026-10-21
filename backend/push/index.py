"""Push-уведомления и звонки мессенджера: ключ и подписки устройств, вызов, ответ, завершение звонка"""
import json
import os

import psycopg2

import push_utils
import calls_logic
import gif_search
import group_calls

SCHEMA = "t_p64541051_serge_chat_app"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}


def reply(status: int, payload: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(payload)}


def handler(event: dict, context) -> dict:
    """Отдаёт публичный ключ для подписки, сохраняет и удаляет подписки устройств пользователя"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    if params.get("action") in gif_search.ACTIONS:
        return gif_search.handler(event, context)
    if params.get("action") in calls_logic.ACTIONS:
        return calls_logic.handler(event, context)
    headers = event.get("headers") or {}
    action = params.get("action")
    body = json.loads(event.get("body") or "{}") if method == "POST" else {}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    try:
        if action in group_calls.ACTIONS:
            session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
            gid = None
            if session_id:
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE session_id = %s AND (session_expires_at IS NULL OR session_expires_at > NOW())", (session_id,))
                grow = cur.fetchone()
                gid = grow[0] if grow else None
            if gid is None:
                return reply(401, {"error": "Нужна авторизация", "code": "session_expired" if session_id else None})
            return group_calls.handler(event, context, cur, conn, gid, params, body)

        if method == "GET" and action == "key":
            _, public = push_utils.load_vapid(cur, conn)
            return reply(200, {"publicKey": public})

        session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
        user_id = None
        if session_id:
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE session_id = %s AND (session_expires_at IS NULL OR session_expires_at > NOW())", (session_id,))
            row = cur.fetchone()
            user_id = row[0] if row else None
        if user_id is None:
            return reply(401, {"error": "Нужна авторизация"})

        if method == "POST" and action == "subscribe":
            sub = body.get("subscription") or {}
            keys = sub.get("keys") or {}
            endpoint = sub.get("endpoint")
            if not endpoint or not keys.get("p256dh") or not keys.get("auth"):
                return reply(400, {"error": "Некорректная подписка"})
            cur.execute(f"""
                INSERT INTO {SCHEMA}.push_subscriptions (user_id, endpoint, p256dh, auth)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
            """, (user_id, endpoint, keys["p256dh"], keys["auth"]))
            conn.commit()
            return reply(200, {"ok": True})

        if method == "POST" and action == "register-token":
            token = (body.get("token") or "").strip()
            if len(token) < 20:
                return reply(400, {"error": "Некорректный токен устройства"})
            cur.execute(f"""
                INSERT INTO {SCHEMA}.push_tokens (user_id, token, platform)
                VALUES (%s, %s, %s)
                ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id
            """, (user_id, token, (body.get("platform") or "android")[:16]))
            conn.commit()
            return reply(200, {"ok": True})

        if method == "POST" and action == "unregister-token":
            token = (body.get("token") or "").strip()
            cur.execute(f"DELETE FROM {SCHEMA}.push_tokens WHERE token = %s AND user_id = %s", (token, user_id))
            conn.commit()
            return reply(200, {"ok": True})

        if method == "POST" and action == "unsubscribe":
            endpoint = body.get("endpoint")
            if not endpoint:
                return reply(400, {"error": "Нужен endpoint"})
            cur.execute(
                f"DELETE FROM {SCHEMA}.push_subscriptions WHERE endpoint = %s AND user_id = %s",
                (endpoint, user_id),
            )
            conn.commit()
            return reply(200, {"ok": True})

        return reply(404, {"error": "Неизвестное действие"})
    finally:
        cur.close()
        conn.close()
