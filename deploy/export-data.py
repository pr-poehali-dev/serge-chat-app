import os
import sys

import psycopg2

SCHEMA = "t_p64541051_serge_chat_app"

TABLES = [
    ("users", "id"),
    ("chats", "id"),
    ("chat_members", "id"),
    ("chat_topics", "id"),
    ("messages", "id"),
    ("message_reactions", "id"),
]

DEFERRED = {"chats": ["pinned_message_id"]}


def literal(conn, value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (bytes, bytearray, memoryview)):
        return "'\\x" + bytes(value).hex() + "'"
    text = str(value).replace("\x00", "")
    return "'" + text.replace("'", "''") + "'"


def main():
    dsn = os.environ.get("SOURCE_DATABASE_URL")
    if not dsn:
        sys.exit("Не задана переменная SOURCE_DATABASE_URL (адрес базы poehali.dev)")

    target = sys.argv[1] if len(sys.argv) > 1 else "-"
    if target == "-":
        out = sys.stdout
    else:
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        out = os.fdopen(fd, "w", encoding="utf-8")

    conn = psycopg2.connect(dsn)
    conn.set_client_encoding("UTF8")
    cur = conn.cursor()

    out.write("BEGIN;\n")
    deferred_updates = []
    counts = {}

    for table, pk in TABLES:
        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = %s AND table_name = %s ORDER BY ordinal_position",
            (SCHEMA, table),
        )
        columns = [r[0] for r in cur.fetchall()]
        if not columns:
            sys.exit(f"В базе нет таблицы {table}")
        skip = DEFERRED.get(table, [])
        insert_cols = [c for c in columns if c not in skip]

        cur.execute(f"SELECT {', '.join(columns)} FROM {SCHEMA}.{table} ORDER BY {pk}")
        rows = cur.fetchall()
        counts[table] = len(rows)

        for row in rows:
            record = dict(zip(columns, row))
            values = ", ".join(literal(conn, record[c]) for c in insert_cols)
            out.write(f"INSERT INTO {SCHEMA}.{table} ({', '.join(insert_cols)}) VALUES ({values});\n")
            for c in skip:
                if record[c] is not None:
                    deferred_updates.append(
                        f"UPDATE {SCHEMA}.{table} SET {c} = {literal(conn, record[c])} WHERE {pk} = {literal(conn, record[pk])};\n"
                    )

    for line in deferred_updates:
        out.write(line)

    for table, pk in TABLES:
        out.write(
            f"SELECT setval(pg_get_serial_sequence('{SCHEMA}.{table}', '{pk}'), "
            f"COALESCE((SELECT MAX({pk}) FROM {SCHEMA}.{table}), 1), "
            f"(SELECT COUNT(*) FROM {SCHEMA}.{table}) > 0);\n"
        )

    out.write("COMMIT;\n")
    out.flush()
    if out is not sys.stdout:
        out.close()

    cur.close()
    conn.close()

    sys.stderr.write("Выгружено строк:\n")
    for table, _ in TABLES:
        sys.stderr.write(f"  {table}: {counts[table]}\n")


if __name__ == "__main__":
    main()
