"""Регистрация, вход, восстановление пароля и профиль для мессенджера Трынделка"""
import json
import os
import re
import io
import base64
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
import psycopg2
import boto3

from email_utils import send_email

SCHEMA = "t_p64541051_serge_chat_app"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    "Access-Control-Max-Age": "86400",
}

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

RESET_TOKEN_TTL_MINUTES = 60

USER_FIELDS = "id, email, login, first_name, last_name, display_name, avatar_initials, avatar_color, avatar_url, session_id"


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
        "avatarUrl": r[8],
        "sessionId": r[9],
    }


def get_origin(event: dict) -> str:
    headers = event.get("headers") or {}
    origin = headers.get("origin") or headers.get("Origin") or headers.get("referer") or headers.get("Referer")
    if origin:
        return origin.rstrip("/")
    return "https://poehali.dev"


def upload_avatar(user_id: int, image_base64: str, content_type: str) -> str:
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    data = base64.b64decode(image_base64)

    ext = "png"
    if "jpeg" in content_type or "jpg" in content_type:
        ext = "jpg"
    elif "webp" in content_type:
        ext = "webp"
    elif "gif" in content_type:
        ext = "gif"

    key = f"avatars/{user_id}-{uuid.uuid4().hex}.{ext}"

    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType=content_type or "image/png")

    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def handler(event: dict, context) -> dict:
    """Обрабатывает регистрацию, вход, восстановление пароля, загрузку аватара и профиль пользователя"""
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
            cur.execute(f"SELECT {USER_FIELDS} FROM {SCHEMA}.users WHERE session_id = %s", (session_id,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия недействительна"})}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user_row_to_dict(row)})}

        if method == "GET" and params.get("action") == "users":
            session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
            exclude_id = None
            if session_id:
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE session_id = %s", (session_id,))
                row = cur.fetchone()
                exclude_id = row[0] if row else None

            search = (params.get("search") or "").strip()

            conditions = []
            query_args = []
            if exclude_id:
                conditions.append("id != %s")
                query_args.append(exclude_id)
            if search:
                conditions.append("(login ILIKE %s OR first_name ILIKE %s OR last_name ILIKE %s OR display_name ILIKE %s)")
                like = f"%{search}%"
                query_args.extend([like, like, like, like])

            where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

            cur.execute(f"""
                SELECT id, display_name, avatar_initials, avatar_color, avatar_url, login
                FROM {SCHEMA}.users
                {where_clause}
                ORDER BY display_name
                LIMIT 50
            """, tuple(query_args))
            rows = cur.fetchall()
            users = [{
                "id": r[0], "displayName": r[1], "avatarInitials": r[2],
                "avatarColor": r[3], "avatarUrl": r[4], "login": r[5],
            } for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"users": users})}

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
                RETURNING {USER_FIELDS}
            """, (login, display_name, initials, session_id, email, pwd_hash, salt, login, first_name, last_name))
            row = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user_row_to_dict(row)})}

        if method == "POST" and action == "login":
            email = (body.get("email") or "").strip().lower()
            password = body.get("password") or ""

            cur.execute(f"""
                SELECT {USER_FIELDS}, password_hash, password_salt
                FROM {SCHEMA}.users WHERE email = %s
            """, (email,))
            row = cur.fetchone()
            if not row or not row[10] or not row[11]:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный email или пароль"})}

            if hash_password(password, row[11]) != row[10]:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный email или пароль"})}

            session_id = secrets.token_hex(32)
            cur.execute(f"UPDATE {SCHEMA}.users SET session_id = %s, is_online = true WHERE id = %s", (session_id, row[0]))
            conn.commit()

            user_dict = user_row_to_dict((row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], session_id))
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user_dict})}

        if method == "POST" and action == "forgot-password":
            email = (body.get("email") or "").strip().lower()
            if not email or not EMAIL_RE.match(email):
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректный email"})}

            cur.execute(f"SELECT id, display_name FROM {SCHEMA}.users WHERE email = %s", (email,))
            row = cur.fetchone()

            # Always respond with success to avoid leaking which emails are registered
            if not row:
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

            token = secrets.token_hex(32)
            expires = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)
            cur.execute(f"""
                UPDATE {SCHEMA}.users SET reset_token = %s, reset_token_expires = %s WHERE id = %s
            """, (token, expires, row[0]))
            conn.commit()

            reset_link = f"{get_origin(event)}/reset-password?token={token}"
            html = f"""
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                    <h2 style="color:#a855f7;">Трынделка</h2>
                    <p>Здравствуйте, {row[1] or ''}!</p>
                    <p>Мы получили запрос на восстановление пароля. Ссылка действует {RESET_TOKEN_TTL_MINUTES} минут.</p>
                    <p><a href="{reset_link}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;border-radius:12px;text-decoration:none;">Сбросить пароль</a></p>
                    <p style="color:#888;font-size:12px;">Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
                </div>
            """
            try:
                send_email(email, "Восстановление пароля — Трынделка", html)
            except Exception:
                return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": "Не удалось отправить письмо. Попробуйте позже"})}

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        if method == "POST" and action == "reset-password":
            token = (body.get("token") or "").strip()
            password = body.get("password") or ""

            if not token:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Токен не передан"})}
            if len(password) < 6:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Пароль должен быть не короче 6 символов"})}

            cur.execute(f"""
                SELECT id, reset_token_expires FROM {SCHEMA}.users WHERE reset_token = %s
            """, (token,))
            row = cur.fetchone()
            if not row or not row[1] or row[1] < datetime.utcnow():
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Ссылка недействительна или устарела"})}

            salt = secrets.token_hex(16)
            pwd_hash = hash_password(password, salt)
            session_id = secrets.token_hex(32)
            cur.execute(f"""
                UPDATE {SCHEMA}.users SET
                    password_hash = %s, password_salt = %s,
                    reset_token = NULL, reset_token_expires = NULL,
                    session_id = %s
                WHERE id = %s
                RETURNING {USER_FIELDS}
            """, (pwd_hash, salt, session_id, row[0]))
            user_row = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user_row_to_dict(user_row)})}

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
                RETURNING {USER_FIELDS}
            """, (login, first_name, last_name, display_name, initials, current[0]))
            row = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user_row_to_dict(row)})}

        if method == "POST" and action == "upload-avatar":
            session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
            if not session_id:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Нет сессии"})}

            image_base64 = body.get("imageBase64")
            content_type = body.get("contentType") or "image/png"
            if not image_base64:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Изображение не передано"})}

            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE session_id = %s", (session_id,))
            current = cur.fetchone()
            if not current:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия недействительна"})}

            try:
                avatar_url = upload_avatar(current[0], image_base64, content_type)
            except Exception:
                return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": "Не удалось загрузить изображение"})}

            cur.execute(f"""
                UPDATE {SCHEMA}.users SET avatar_url = %s WHERE id = %s
                RETURNING {USER_FIELDS}
            """, (avatar_url, current[0]))
            row = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user_row_to_dict(row)})}

        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"})}

    finally:
        cur.close()
        conn.close()