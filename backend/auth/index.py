"""Регистрация и вход по email/паролю для мессенджера Трынделка"""
import json
import os
import re
import hashlib
import secrets
import psycopg2

SCHEMA = "t_p64541051_serge_chat_app"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    "Access-Control-Max-Age": "86400",
}

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 100000).hex()


def user_row_to_dict(r):
    return {
        "id": r[0],
        "email": r[1],
        "login": r[2],
        "firstName": r[3] or "",
        "lastName": r[4] or "",
        "displayName": r[5],
        "avatarInitials": r[6],
        "avatarColor": r[7],
        "sessionId": r[8],
    }


def handler(event: dict, context) -> dict:
    """Обрабатывает регистрацию, вход и получение текущего пользователя по сессии"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    headers = event.get("headers") or {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET" and params.get("action") == "me":
            session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
            if not session_id:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Нет сессии"})}
            cur.execute(f"""
                SELECT id, email, login, first_name, last_name, display_name, avatar_initials, avatar_color, session_id
                FROM {SCHEMA}.users WHERE session_id = %s
            """, (session_id,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия недействительна"})}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user_row_to_dict(row)})}

        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if method == "POST" and action == "register":
            email = (body.get("email") or "").strip().lower()
            password = body.get("password") or ""
            login = (body.get("login") or "").strip()
            first_name = (body.get("firstName") or "").strip()
            last_name = (body.get("lastName") or "").strip()

            if not email or not EMAIL_RE.match(email):
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректный email"})}
            if len(password) < 6:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Пароль должен быть не короче 6 символов"})}
            if not login:
                login = email.split("@")[0]

            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
            if cur.fetchone():
                return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Пользователь с таким email уже существует"})}

            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE login = %s", (login,))
            if cur.fetchone():
                return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Такой логин уже занят"})}

            salt = secrets.token_hex(16)
            pwd_hash = hash_password(password, salt)
            session_id = secrets.token_hex(32)
            display_name = f"{first_name} {last_name}".strip() or login
            initials = "".join([p[0].upper() for p in display_name.split()[:2]]) or login[:2].upper()

            cur.execute(f"""
                INSERT INTO {SCHEMA}.users
                    (username, display_name, avatar_initials, avatar_color, is_online, session_id,
                     email, password_hash, password_salt, login, first_name, last_name)
                VALUES (%s, %s, %s, '#a855f7', true, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, email, login, first_name, last_name, display_name, avatar_initials, avatar_color, session_id
            """, (login, display_name, initials, session_id, email, pwd_hash, salt, login, first_name, last_name))
            row = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user_row_to_dict(row)})}

        if method == "POST" and action == "login":
            email = (body.get("email") or "").strip().lower()
            password = body.get("password") or ""

            cur.execute(f"""
                SELECT id, email, login, first_name, last_name, display_name, avatar_initials, avatar_color,
                       password_hash, password_salt
                FROM {SCHEMA}.users WHERE email = %s
            """, (email,))
            row = cur.fetchone()
            if not row or not row[8] or not row[9]:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный email или пароль"})}

            if hash_password(password, row[9]) != row[8]:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный email или пароль"})}

            session_id = secrets.token_hex(32)
            cur.execute(f"UPDATE {SCHEMA}.users SET session_id = %s, is_online = true WHERE id = %s", (session_id, row[0]))
            conn.commit()

            user_dict = user_row_to_dict((row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], session_id))
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user_dict})}

        if method == "POST" and action == "update-profile":
            session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
            if not session_id:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Нет сессии"})}

            login = (body.get("login") or "").strip()
            first_name = (body.get("firstName") or "").strip()
            last_name = (body.get("lastName") or "").strip()

            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE session_id = %s", (session_id,))
            current = cur.fetchone()
            if not current:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия недействительна"})}

            if login:
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE login = %s AND id != %s", (login, current[0]))
                if cur.fetchone():
                    return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Такой логин уже занят"})}

            display_name = f"{first_name} {last_name}".strip()
            initials = "".join([p[0].upper() for p in display_name.split()[:2]]) if display_name else None

            cur.execute(f"""
                UPDATE {SCHEMA}.users SET
                    login = COALESCE(NULLIF(%s, ''), login),
                    first_name = %s,
                    last_name = %s,
                    display_name = COALESCE(NULLIF(%s, ''), display_name),
                    avatar_initials = COALESCE(%s, avatar_initials)
                WHERE id = %s
                RETURNING id, email, login, first_name, last_name, display_name, avatar_initials, avatar_color, session_id
            """, (login, first_name, last_name, display_name, initials, current[0]))
            row = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user_row_to_dict(row)})}

        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"})}

    finally:
        cur.close()
        conn.close()
