import base64
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

SCHEMA = "t_p64541051_serge_chat_app"
SCOPE = "https://www.googleapis.com/auth/firebase.messaging"


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def load_account():
    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if not raw:
        return None
    try:
        acc = json.loads(raw)
        if acc.get("client_email") and acc.get("private_key") and acc.get("project_id"):
            return acc
    except ValueError:
        pass
    print("FIREBASE_SERVICE_ACCOUNT: некорректный JSON")
    return None


def _request_token(acc: dict) -> tuple:
    now = int(time.time())
    token_uri = acc.get("token_uri") or "https://oauth2.googleapis.com/token"
    header = _b64(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
    claims = _b64(json.dumps({"iss": acc["client_email"], "scope": SCOPE, "aud": token_uri, "iat": now, "exp": now + 3600}).encode())
    key = serialization.load_pem_private_key(acc["private_key"].encode(), password=None)
    signature = key.sign(f"{header}.{claims}".encode(), padding.PKCS1v15(), hashes.SHA256())
    body = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": f"{header}.{claims}.{_b64(signature)}",
    }).encode()
    req = urllib.request.Request(token_uri, data=body, headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=4) as resp:
        data = json.loads(resp.read().decode())
    return data["access_token"], now + int(data.get("expires_in", 3600))


def access_token(conn, acc: dict) -> str:
    """Токен доступа к Firebase. Хранится в базе, чтобы не запрашивать его при каждом сообщении"""
    cur = conn.cursor()
    cur.execute(f"SELECT value FROM {SCHEMA}.app_settings WHERE key = 'fcm_token'")
    row = cur.fetchone()
    if row:
        try:
            cached = json.loads(row[0])
            if cached.get("exp", 0) > time.time() + 120 and cached.get("account") == acc["client_email"]:
                return cached["token"]
        except ValueError:
            pass
    token, exp = _request_token(acc)
    cur.execute(
        f"""INSERT INTO {SCHEMA}.app_settings (key, value) VALUES ('fcm_token', %s)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value""",
        (json.dumps({"token": token, "exp": exp, "account": acc["client_email"]}),),
    )
    conn.commit()
    return token


def build_message(token: str, payload: dict, ttl: int, urgent: bool) -> dict:
    kind = payload.get("type")
    is_call = kind in ("call", "group-call")
    if kind in ("call", "call-cancel"):
        data = {k: str(v) for k, v in payload.items() if v is not None}
        return {
            "message": {
                "token": token,
                "data": data,
                "android": {"priority": "HIGH", "ttl": f"{ttl}s"},
            }
        }
    data = {k: str(v) for k, v in payload.items() if v is not None and k not in ("title", "body")}
    return {
        "message": {
            "token": token,
            "notification": {"title": payload.get("title", "Трынделка"), "body": payload.get("body", "")},
            "data": data,
            "android": {
                "priority": "HIGH" if urgent else "NORMAL",
                "ttl": f"{ttl}s",
                "collapse_key": payload.get("tag") or None,
                "notification": {
                    "channel_id": "calls" if is_call else "messages",
                    "tag": payload.get("tag") or None,
                    "sound": "default",
                    "default_vibrate_timings": True,
                    "notification_priority": "PRIORITY_MAX" if is_call else "PRIORITY_HIGH",
                },
            },
        }
    }


def _strip_none(obj):
    if isinstance(obj, dict):
        return {k: _strip_none(v) for k, v in obj.items() if v is not None}
    return obj


def send_one(acc: dict, access: str, token: str, payload: dict, ttl: int, urgent: bool) -> str:
    """Возвращает 'ok', 'dead' (токен недействителен) или 'fail'"""
    base = os.environ.get("FCM_BASE") or "https://fcm.googleapis.com"
    url = f"{base}/v1/projects/{acc['project_id']}/messages:send"
    body = json.dumps(_strip_none(build_message(token, payload, ttl, urgent))).encode()
    req = urllib.request.Request(url, data=body, headers={"Authorization": f"Bearer {access}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=3):
            return "ok"
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", "ignore")
        if e.code == 404 or "UNREGISTERED" in text or "registration-token-not-registered" in text:
            return "dead"
        print(f"fcm failed: {e.code} {text[:200]}")
        return "fail"
    except Exception as e:
        print(f"fcm failed: {type(e).__name__}")
        return "fail"
