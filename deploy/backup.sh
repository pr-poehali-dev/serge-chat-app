#!/bin/sh
# Ночная резервная копия мессенджера: база данных и загруженные файлы.
# Запускается таймером systemd (trindelka-backup.timer) или вручную: sudo ./backup.sh
set -eu

ENV_FILE="${ENV_FILE:-/etc/trindelka.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/trindelka}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"

if [ -f "$ENV_FILE" ]; then
  set -a
  . "$ENV_FILE"
  set +a
fi

: "${DATABASE_URL:?Не задан DATABASE_URL (проверьте $ENV_FILE)}"

if [ -n "${BACKUP_PASSPHRASE:-}" ] && ! command -v openssl >/dev/null 2>&1; then
  echo "ОШИБКА: задан BACKUP_PASSPHRASE, но openssl не установлен (apt install openssl)." >&2
  exit 1
fi

umask 077
mkdir -p "$BACKUP_DIR"
WORK="$BACKUP_DIR/.work-$STAMP"
mkdir -p "$WORK"
trap 'rm -rf "$WORK"' EXIT INT TERM

echo "[$(date '+%F %T')] База данных..."
pg_dump --no-owner --no-privileges --format=custom --file="$WORK/db.dump" "$DATABASE_URL"

if [ -n "${LOCAL_STORAGE_DIR:-}" ] && [ -d "$LOCAL_STORAGE_DIR" ]; then
  echo "[$(date '+%F %T')] Файлы из $LOCAL_STORAGE_DIR..."
  tar -C "$LOCAL_STORAGE_DIR" -czf "$WORK/files.tar.gz" .
else
  echo "Папка файлов не найдена (LOCAL_STORAGE_DIR не задан), копирую только базу"
fi

# Файл настроек содержит пароли и ключи. Кладём его в копию только если копия шифруется
# (или вы явно разрешили BACKUP_INCLUDE_ENV=1), иначе пароли лежали бы открыто.
if [ -f "$ENV_FILE" ]; then
  if [ -n "${BACKUP_PASSPHRASE:-}" ] || [ "${BACKUP_INCLUDE_ENV:-0}" = "1" ]; then
    cp "$ENV_FILE" "$WORK/trindelka.env"
  else
    echo "Файл настроек в копию не включён (нет шифрования). Сохраните $ENV_FILE отдельно и надёжно."
  fi
fi

( cd "$WORK" && sha256sum * > SHA256SUMS )

OUT="$BACKUP_DIR/trindelka-$STAMP.tar"
tar -C "$WORK" -cf "$OUT" .

if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
  if ! openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_PASSPHRASE -in "$OUT" -out "$OUT.enc"; then
    rm -f "$OUT" "$OUT.enc"
    echo "ОШИБКА: не удалось зашифровать копию (установлен ли openssl?). Нешифрованная копия удалена, ничего не сохранено." >&2
    exit 1
  fi
  rm -f "$OUT"
  OUT="$OUT.enc"
fi

chmod 600 "$OUT"
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'trindelka-*.tar' -o -name 'trindelka-*.tar.enc' \) -mtime +"$KEEP_DAYS" -delete

if [ -n "${BACKUP_REMOTE:-}" ]; then
  echo "[$(date '+%F %T')] Копия на другой сервер: $BACKUP_REMOTE"
  rsync -a --partial "$OUT" "$BACKUP_REMOTE" || echo "ВНИМАНИЕ: не удалось отправить копию на $BACKUP_REMOTE, локальная копия сохранена"
fi

SIZE="$(du -h "$OUT" | cut -f1)"
echo "[$(date '+%F %T')] Готово: $OUT ($SIZE)"
