import csv
import io
import os
import re
import sys
from collections import defaultdict

import psycopg2
from psycopg2.extras import execute_values

SKIP_TABLES = {"calls", "group_calls", "group_call_members", "group_call_signals", "app_settings", "push_subscriptions"}
REQUIRED = ("users", "chats", "chat_members", "messages")
DEFERRED = {("chats", "pinned_message_id")}
NULL_MARKERS = {"NULL", "\\N"}
TRUE_VALUES = {"true", "t", "1", "yes", "y", "да"}
FALSE_VALUES = {"false", "f", "0", "no", "n", "нет"}
TEXT_TYPES = {"character varying", "text", "character"}


def read_rows(path):
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "cp1251"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            text = None
    if text is None:
        sys.exit(f"{os.path.basename(path)}: не удалось прочитать кодировку. Сохраните файл в UTF-8")
    head = text.split("\n", 1)[0]
    delimiter = max([",", ";", "\t"], key=head.count)
    rows = list(csv.reader(io.StringIO(text, newline=""), delimiter=delimiter))
    rows = [r for r in rows if any(cell.strip() for cell in r)]
    if not rows:
        return [], []
    return [h.strip().lstrip("\ufeff") for h in rows[0]], rows[1:]


def match_table(stem, tables):
    stem = stem.lower()
    if stem in tables:
        return stem
    best = None
    for t in tables:
        if stem.endswith("." + t) or stem.endswith("_" + t) or stem.startswith(t + "_") or stem.startswith(t + "-") or stem.endswith("-" + t):
            if best is None or len(t) > len(best):
                best = t
    return best


def convert(value, col, where):
    dtype, nullable = col["type"], col["nullable"]
    v = value.replace("\x00", "")
    stripped = v.strip()
    if dtype in TEXT_TYPES:
        if stripped in NULL_MARKERS and nullable:
            return None
        if v == "" and nullable:
            return None
        return v
    if stripped == "" or stripped in NULL_MARKERS or stripped.lower() == "null":
        if not nullable:
            sys.exit(f"{where}: пустое значение в обязательной колонке «{col['name']}»")
        return None
    if dtype == "boolean":
        low = stripped.lower()
        if low in TRUE_VALUES:
            return True
        if low in FALSE_VALUES:
            return False
        sys.exit(f"{where}: не понимаю значение «{value}» в колонке «{col['name']}» (ожидалось true или false)")
    if dtype in ("integer", "bigint", "smallint"):
        if re.fullmatch(r"-?\d+\.0+", stripped):
            stripped = stripped.split(".")[0]
        if not re.fullmatch(r"-?\d+", stripped):
            sys.exit(f"{where}: в колонке «{col['name']}» должно быть число, а там «{value}»")
        return int(stripped)
    return stripped


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


def detect_schema(cur):
    forced = os.environ.get("DB_SCHEMA")
    if forced:
        return forced
    cur.execute(
        "SELECT table_schema FROM information_schema.tables "
        "WHERE table_name = 'chat_topics' AND table_schema NOT IN ('pg_catalog', 'information_schema')"
    )
    found = [r[0] for r in cur.fetchall()]
    if len(found) != 1:
        sys.exit("Не удалось определить схему. Укажите её: export DB_SCHEMA=имя_схемы")
    return found[0]


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
    folder = sys.argv[1] if len(sys.argv) > 1 else ""
    if not folder or not os.path.isdir(folder):
        sys.exit("Использование: python deploy/import-csv.py ПАПКА_С_CSV")
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("Не задана переменная DATABASE_URL (адрес новой базы)")
    csv.field_size_limit(sys.maxsize)

    conn = psycopg2.connect(dsn)
    conn.set_client_encoding("UTF8")
    cur = conn.cursor()
    schema = detect_schema(cur)

    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = %s AND table_type = 'BASE TABLE'", (schema,))
    db_tables = {r[0] for r in cur.fetchall()} - SKIP_TABLES
    if not set(REQUIRED) <= db_tables:
        sys.exit("В новой базе нет таблиц мессенджера. Сначала выполните шаг «Создайте таблицы»")

    files = {}
    for name in sorted(os.listdir(folder)):
        if not name.lower().endswith(".csv"):
            continue
        table = match_table(os.path.splitext(name)[0], db_tables)
        if table is None:
            print(f"ПРОПУЩЕН (не похож на таблицу мессенджера или не нужен): {name}")
            continue
        if table in files:
            sys.exit(f"Два файла для таблицы {table}: {files[table]} и {name}. Оставьте один")
        files[table] = name

    missing = [t for t in REQUIRED if t not in files]
    if missing:
        sys.exit("Не найдены обязательные файлы для таблиц: " + ", ".join(missing) + ". Назовите файлы по именам таблиц, например users.csv")

    for table in files:
        cur.execute(f'SELECT count(*) FROM "{schema}"."{table}"')
        if cur.fetchone()[0] > 0:
            sys.exit(f"В таблице {table} уже есть данные. Загружать нужно в пустую базу (см. шаг «Создайте таблицы»)")

    order = [t for t in table_order(cur, schema, db_tables) if t in files]
    counts = {}
    deferred_updates = []

    for table in order:
        cur.execute(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns "
            "WHERE table_schema = %s AND table_name = %s ORDER BY ordinal_position",
            (schema, table),
        )
        cols = {r[0]: {"name": r[0], "type": r[1], "nullable": r[2] == "YES"} for r in cur.fetchall()}
        header, rows = read_rows(os.path.join(folder, files[table]))
        unknown = [h for h in header if h not in cols]
        if unknown:
            print(f"  {table}: колонки, которых нет в новой базе, пропущены: {', '.join(unknown)}")
        use = [h for h in header if h in cols]
        if not use:
            sys.exit(f"{files[table]}: не найдена строка с названиями колонок. Первая строка файла должна быть заголовком")
        idx = {h: header.index(h) for h in use}
        skip = {c for (t, c) in DEFERRED if t == table}
        insert_cols = [c for c in use if c not in skip]
        key_col = "id" if "id" in use else use[0]

        data = []
        for n, row in enumerate(rows, start=2):
            where = f"{files[table]}, строка {n}"
            if len(row) < len(header):
                row = row + [""] * (len(header) - len(row))
            rec = {c: convert(row[idx[c]], cols[c], where) for c in use}
            data.append(tuple(rec[c] for c in insert_cols))
            for c in skip:
                if rec[c] is not None:
                    deferred_updates.append((table, c, rec[c], rec[key_col], key_col))
        if data:
            col_sql = ", ".join(f'"{c}"' for c in insert_cols)
            execute_values(cur, f'INSERT INTO "{schema}"."{table}" ({col_sql}) VALUES %s', data, page_size=500)
        counts[table] = len(data)

    for table, col, value, key, key_col in deferred_updates:
        cur.execute(f'UPDATE "{schema}"."{table}" SET "{col}" = %s WHERE "{key_col}" = %s', (value, key))

    for table in order:
        cur.execute(
            "SELECT 1 FROM information_schema.columns WHERE table_schema = %s AND table_name = %s "
            "AND column_name = 'id' AND column_default LIKE 'nextval%%'",
            (schema, table),
        )
        if cur.fetchone():
            cur.execute(
                f"SELECT setval(pg_get_serial_sequence('\"{schema}\".\"{table}\"', 'id'), "
                f'COALESCE((SELECT MAX(id) FROM "{schema}"."{table}"), 1), '
                f'(SELECT COUNT(*) FROM "{schema}"."{table}") > 0)'
            )

    conn.commit()
    cur.close()
    conn.close()

    print(f"Схема: {schema}\nЗагружено строк:")
    for table in order:
        print(f"  {table}: {counts[table]}  ({files[table]})")


if __name__ == "__main__":
    main()
