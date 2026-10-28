import os
import sys
from collections import defaultdict

import psycopg2

SKIP_TABLES = {"calls", "group_calls", "group_call_members", "group_call_signals"}
DEFERRED = {("chats", "pinned_message_id")}


def detect_schema(cur):
    forced = os.environ.get("SOURCE_SCHEMA")
    if forced:
        return forced
    cur.execute(
        "SELECT table_schema FROM information_schema.tables "
        "WHERE table_name = 'chat_topics' AND table_schema NOT IN ('pg_catalog', 'information_schema')"
    )
    found = [r[0] for r in cur.fetchall()]
    if len(found) != 1:
        sys.exit("Не удалось определить схему мессенджера. Укажите её: export SOURCE_SCHEMA=имя_схемы")
    return found[0]


def sort_tables(tables, deps):
    order, done = [], set()
    pending = sorted(tables)
    while pending:
        progressed = False
        for t in list(pending):
            if deps.get(t, set()) <= done:
                order.append(t)
                done.add(t)
                pending.remove(t)
                progressed = True
        if not progressed:
            sys.exit("Таблицы связаны по кругу, порядок не определить: " + ", ".join(pending))
    return order


def table_order(cur, schema, tables):
    cur.execute(
        """
        SELECT tc.table_name, ccu.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON kcu.constraint_name = tc.constraint_name AND kcu.constraint_schema = tc.constraint_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = %s
        """,
        (schema,),
    )
    deps = defaultdict(set)
    for child, parent, column in cur.fetchall():
        if child == parent or (child, column) in DEFERRED:
            continue
        if child in tables and parent in tables:
            deps[child].add(parent)
    return sort_tables(tables, deps)


def main():
    dsn = os.environ.get("SOURCE_DATABASE_URL")
    if not dsn:
        sys.exit("Не задана переменная SOURCE_DATABASE_URL (адрес базы poehali.dev)")

    target = sys.argv[1] if len(sys.argv) > 1 else "-"
    conn = psycopg2.connect(dsn)
    conn.set_client_encoding("UTF8")
    cur = conn.cursor()
    schema = detect_schema(cur)

    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = %s AND table_type = 'BASE TABLE'", (schema,))
    tables = {r[0] for r in cur.fetchall()} - SKIP_TABLES
    if "users" not in tables or "messages" not in tables:
        sys.exit("В схеме нет таблиц мессенджера, проверьте адрес базы")
    order = table_order(cur, schema, tables)

    if target == "-":
        out = sys.stdout
    else:
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        out = os.fdopen(fd, "w", encoding="utf-8")

    def lit(value):
        if isinstance(value, str):
            value = value.replace("\x00", "")
        return cur.mogrify("%s", (value,)).decode("utf-8")

    out.write("BEGIN;\n")
    deferred_updates = []
    counts = {}

    for table in order:
        cur.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = %s AND table_name = %s ORDER BY ordinal_position",
            (schema, table),
        )
        columns = [r[0] for r in cur.fetchall()]
        skip = {c for (t, c) in DEFERRED if t == table}
        insert_cols = [c for c in columns if c not in skip]
        cur.execute(f'SELECT {", ".join(columns)} FROM "{schema}"."{table}" ORDER BY 1')
        rows = cur.fetchall()
        counts[table] = len(rows)
        for row in rows:
            record = dict(zip(columns, row))
            values = ", ".join(lit(record[c]) for c in insert_cols)
            out.write(f'INSERT INTO "{schema}"."{table}" ({", ".join(insert_cols)}) VALUES ({values});\n')
            for c in skip:
                if record[c] is not None:
                    deferred_updates.append(
                        f'UPDATE "{schema}"."{table}" SET {c} = {lit(record[c])} WHERE {columns[0]} = {lit(record[columns[0]])};\n'
                    )

    for line in deferred_updates:
        out.write(line)

    for table in order:
        cur.execute(
            "SELECT 1 FROM information_schema.columns WHERE table_schema = %s AND table_name = %s AND column_name = 'id' AND column_default LIKE 'nextval%%'",
            (schema, table),
        )
        if cur.fetchone():
            out.write(
                f"SELECT setval(pg_get_serial_sequence('\"{schema}\".\"{table}\"', 'id'), "
                f'COALESCE((SELECT MAX(id) FROM "{schema}"."{table}"), 1), '
                f'(SELECT COUNT(*) FROM "{schema}"."{table}") > 0);\n'
            )

    out.write("COMMIT;\n")
    out.flush()
    if out is not sys.stdout:
        out.close()
    cur.close()
    conn.close()

    sys.stderr.write(f"Схема: {schema}\nВыгружено строк:\n")
    for table in order:
        sys.stderr.write(f"  {table}: {counts[table]}\n")


if __name__ == "__main__":
    main()
