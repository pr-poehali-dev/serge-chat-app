import json
import os
import urllib.error
import urllib.parse
import urllib.request

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}

ACTIONS = ("gif-search",)
API_BASE = "https://api.klipy.com/api/v1"


def reply(status: int, payload: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(payload)}


def pick(file_obj: dict, sizes: tuple, fmt: str):
    for size in sizes:
        node = (file_obj.get(size) or {}).get(fmt) or {}
        if node.get("url"):
            return node["url"]
    return None


def handler(event: dict, context) -> dict:
    """Поиск GIF по ключевому слову в библиотеке Klipy; без запроса отдаёт популярные"""
    params = event.get("queryStringParameters") or {}
    key = os.environ.get("KLIPY_API_KEY")
    if not key:
        return reply(200, {"items": [], "hasNext": False, "enabled": False})

    q = (params.get("q") or "").strip()[:80]
    try:
        page = max(1, int(params.get("page") or 1))
    except ValueError:
        page = 1

    endpoint = "search" if q else "trending"
    query = {"page": page, "per_page": 24, "customer_id": "trindelka", "locale": "ru"}
    if q:
        query["q"] = q
    url = f"{API_BASE}/{urllib.parse.quote(key, safe='')}/gifs/{endpoint}?{urllib.parse.urlencode(query)}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "trindelka/1.0", "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "ignore")[:300].replace(key, "***")
        print(f"gif search failed: HTTP {e.code} {detail}")
        if e.code in (401, 403, 404, 422):
            return reply(200, {"items": [], "hasNext": False, "enabled": True, "error": "Ключ Klipy не принят. Проверьте его в секретах"})
        return reply(502, {"error": "Поиск GIF сейчас недоступен", "items": [], "enabled": True})
    except Exception as e:
        print(f"gif search failed: {type(e).__name__}")
        return reply(502, {"error": "Поиск GIF сейчас недоступен", "items": [], "enabled": True})

    if not raw.get("result"):
        return reply(502, {"error": "Поиск GIF сейчас недоступен", "items": [], "enabled": True})

    data = raw.get("data") or {}
    rows = data.get("data") if isinstance(data, dict) else data
    items = []
    for row in rows or []:
        files = row.get("file") or {}
        full = pick(files, ("md", "sm", "hd"), "gif")
        preview = pick(files, ("sm", "xs", "md"), "gif") or full
        if not full:
            continue
        items.append({"id": row.get("slug") or str(row.get("id")), "title": row.get("title") or "", "url": full, "preview": preview})

    has_next = bool(data.get("has_next")) if isinstance(data, dict) else len(items) >= 24
    return reply(200, {"items": items, "hasNext": has_next, "enabled": True})
