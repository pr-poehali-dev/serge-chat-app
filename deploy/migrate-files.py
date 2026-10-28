import os
import re
import sys
import urllib.parse
import urllib.request

import psycopg2

TARGET_DIR = os.path.realpath(os.environ["LOCAL_STORAGE_DIR"])
PUBLIC_URL = os.environ["PUBLIC_FILES_URL"].rstrip("/")
URL_RE = re.compile(r"https://cdn\.poehali\.dev/projects/[^/\s]+/bucket/[^\s\"'<>)]+")

COLUMNS = [
    ("users", "avatar_url"),
    ("chats", "avatar_url"),
    ("messages", "media_url"),
    ("messages", "text"),
    ("chat_members", "chat_bg"),
    ("custom_stickers", "url"),
    ("scheduled_messages", "media_url"),
    ("scheduled_messages", "text"),
]

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

schema = os.environ.get("DB_SCHEMA")
if not schema:
    cur.execute(
        "SELECT table_schema FROM information_schema.tables "
        "WHERE table_name = 'chat_topics' AND table_schema NOT IN ('pg_catalog', 'information_schema')"
    )
    found = [r[0] for r in cur.fetchall()]
    if len(found) != 1:
        sys.exit("Не удалось определить схему. Укажите её: export DB_SCHEMA=имя_схемы")
    schema = found[0]

urls = set()
for table, column in COLUMNS:
    cur.execute(f'SELECT DISTINCT {column} FROM "{schema}"."{table}" WHERE {column} LIKE %s', ("%cdn.poehali.dev/projects/%",))
    for (value,) in cur.fetchall():
        urls.update(URL_RE.findall(value or ""))

print(f"Найдено файлов для переноса: {len(urls)}")
mapping = {}
failed = 0
for old_url in sorted(urls):
    key_raw = old_url.split("/bucket/", 1)[1]
    path = os.path.realpath(os.path.join(TARGET_DIR, urllib.parse.unquote(key_raw)))
    if not path.startswith(TARGET_DIR + os.sep):
        failed += 1
        print(f"ПРОПУЩЕН (странный путь): {old_url}")
        continue
    try:
        if not (os.path.isfile(path) and os.path.getsize(path) > 0):
            os.makedirs(os.path.dirname(path), exist_ok=True)
            req = urllib.request.Request(old_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as resp, open(path, "wb") as out:
                out.write(resp.read())
        mapping[old_url] = f"{PUBLIC_URL}/{key_raw}"
        print(f"ok: {key_raw}")
    except Exception as e:
        failed += 1
        print(f"НЕ СКАЧАН: {old_url} ({e})")

for old_url, new_url in mapping.items():
    for table, column in COLUMNS:
        cur.execute(
            f'UPDATE "{schema}"."{table}" SET {column} = REPLACE({column}, %s, %s) WHERE position(%s in {column}) > 0',
            (old_url, new_url, old_url),
        )
conn.commit()
cur.close()
conn.close()
print(f"Перенесено файлов: {len(mapping)}, не удалось: {failed}")
sys.exit(1 if failed else 0)
