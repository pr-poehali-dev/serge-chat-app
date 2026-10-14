import base64
import json
import os
from concurrent.futures import ThreadPoolExecutor, wait

from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid
from pywebpush import WebPushException, webpush

SCHEMA = "t_p64541051_serge_chat_app"
TOTAL_TIMEOUT_SEC = 2.5


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def load_vapid(cur, conn) -> tuple:
    """Возвращает (приватный ключ PEM, публичный ключ) для push. При первом запуске создаёт пару и сохраняет в базе."""
    cur.execute(f"SELECT value FROM {SCHEMA}.app_settings WHERE key = 'vapid'")
    row = cur.fetchone()
    if not row:
        vapid = Vapid()
        vapid.generate_keys()
        private_pem = vapid.private_pem().decode()
        public = _b64url(
            vapid.public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
        )
        cur.execute(
            f"INSERT INTO {SCHEMA}.app_settings (key, value) VALUES ('vapid', %s) ON CONFLICT (key) DO NOTHING",
            (json.dumps({"private": private_pem, "public": public}),),
        )
        conn.commit()
        cur.execute(f"SELECT value FROM {SCHEMA}.app_settings WHERE key = 'vapid'")
        row = cur.fetchone()
    data = json.loads(row[0])
    return data["private"], data["public"]


def send_to_users(conn, user_ids, payload: dict, ttl: int = 86400, urgency: str = "normal") -> int:
    """Отправляет push всем устройствам пользователей. Мёртвые подписки удаляются. Возвращает число доставленных."""
    ids = list(user_ids)
    if not ids:
        return 0
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, endpoint, p256dh, auth FROM {SCHEMA}.push_subscriptions WHERE user_id = ANY(%s)",
        (ids,),
    )
    subs = cur.fetchall()
    if not subs:
        return 0

    private_pem, _ = load_vapid(cur, conn)
    vapid = Vapid.from_pem(private_pem.encode())
    contact = os.environ.get("PUSH_CONTACT") or os.environ.get("SMTP_FROM_EMAIL") or "push@example.com"
    body = json.dumps(payload, ensure_ascii=False)

    def send_one(sub):
        try:
            webpush(
                subscription_info={"endpoint": sub[1], "keys": {"p256dh": sub[2], "auth": sub[3]}},
                data=body,
                vapid_private_key=vapid,
                vapid_claims={"sub": f"mailto:{contact}"},
                ttl=ttl,
                headers={"Urgency": urgency},
                timeout=3,
            )
            return (sub[0], True, False)
        except WebPushException as e:
            code = getattr(getattr(e, "response", None), "status_code", None)
            return (sub[0], False, code in (404, 410))
        except Exception as e:
            print(f"push failed: {type(e).__name__}: {e}")
            return (sub[0], False, False)

    pool = ThreadPoolExecutor(max_workers=8)
    futures = [pool.submit(send_one, s) for s in subs]
    done, _ = wait(futures, timeout=TOTAL_TIMEOUT_SEC)
    pool.shutdown(wait=False, cancel_futures=True)

    results = [f.result() for f in done]
    dead = [r[0] for r in results if r[2]]
    if dead:
        cur.execute(f"DELETE FROM {SCHEMA}.push_subscriptions WHERE id = ANY(%s)", (dead,))
        conn.commit()
    return sum(1 for r in results if r[1])
