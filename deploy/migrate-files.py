import os
import sys
import urllib.parse
import urllib.request

import psycopg2

SCHEMA = "t_p64541051_serge_chat_app"
TARGET_DIR = os.environ["LOCAL_STORAGE_DIR"]
PUBLIC_URL = os.environ["PUBLIC_FILES_URL"].rstrip("/")
OLD_PREFIX = "https://cdn.poehali.dev/projects/"

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

targets = [("users", "avatar_url"), ("messages", "media_url")]
total = 0
failed = 0

for table, column in targets:
    cur.execute(f"SELECT DISTINCT {column} FROM {SCHEMA}.{table} WHERE {column} LIKE %s", (OLD_PREFIX + "%",))
    for (old_url,) in cur.fetchall():
        marker = "/bucket/"
        key = old_url.split(marker, 1)[1] if marker in old_url else None
        if not key:
            continue
        path = os.path.join(TARGET_DIR, urllib.parse.unquote(key))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        try:
            with urllib.request.urlopen(old_url, timeout=30) as resp, open(path, "wb") as out:
                out.write(resp.read())
        except Exception as e:
            failed += 1
            print(f"НЕ СКАЧАН: {old_url} ({e})")
            continue
        new_url = f"{PUBLIC_URL}/{key}"
        cur.execute(f"UPDATE {SCHEMA}.{table} SET {column} = %s WHERE {column} = %s", (new_url, old_url))
        total += 1
        print(f"ok: {key}")

conn.commit()
cur.close()
conn.close()
print(f"Перенесено файлов: {total}, не удалось: {failed}")
sys.exit(1 if failed else 0)
