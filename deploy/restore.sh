#!/bin/sh
# Восстановление из резервной копии: sudo ./restore.sh /var/backups/trindelka/trindelka-ДАТА.tar[.enc]
# База ЗАМЕНЯЕТСЯ целиком. Перед запуском остановите службу: systemctl stop trindelka
set -eu

ARCHIVE="${1:-}"
[ -n "$ARCHIVE" ] && [ -f "$ARCHIVE" ] || { echo "Использование: $0 путь/к/trindelka-ДАТА.tar[.enc]"; exit 1; }

ENV_FILE="${ENV_FILE:-/etc/trindelka.env}"
if [ -f "$ENV_FILE" ]; then
  set -a
  . "$ENV_FILE"
  set +a
fi
: "${DATABASE_URL:?Не задан DATABASE_URL}"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT INT TERM

case "$ARCHIVE" in
  *.enc)
    : "${BACKUP_PASSPHRASE:?Архив зашифрован: задайте BACKUP_PASSPHRASE}"
    openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in "$ARCHIVE" -out "$WORK/archive.tar"
    tar -C "$WORK" -xf "$WORK/archive.tar"
    rm -f "$WORK/archive.tar"
    ;;
  *) tar -C "$WORK" -xf "$ARCHIVE" ;;
esac

echo "Проверяю целостность архива..."
( cd "$WORK" && sha256sum -c SHA256SUMS )

if [ "${ASSUME_YES:-0}" != "1" ]; then
  printf "Заменить текущую базу данных данными из копии? Введите ДА: "
  read -r answer
  [ "$answer" = "ДА" ] || { echo "Отменено"; exit 1; }
fi

echo "Восстанавливаю базу..."
# Копия могла быть сделана более новой версией PostgreSQL, чем стоит на этом сервере.
# Убираем из неё только строки с настройками, которых старый сервер не знает, остальное не меняем.
pg_restore --clean --if-exists --no-owner --no-privileges -f - "$WORK/db.dump" \
  | grep -v -E '^SET (transaction_timeout|idle_session_timeout) = ' \
  | psql -X -q -v ON_ERROR_STOP=1 --single-transaction -d "$DATABASE_URL"

if [ -f "$WORK/files.tar.gz" ]; then
  : "${LOCAL_STORAGE_DIR:?Не задан LOCAL_STORAGE_DIR, а в копии есть файлы}"
  echo "Восстанавливаю файлы в $LOCAL_STORAGE_DIR..."
  mkdir -p "$LOCAL_STORAGE_DIR"
  tar -C "$LOCAL_STORAGE_DIR" -xzf "$WORK/files.tar.gz"
fi

echo "Готово. Запустите службу: systemctl start trindelka"
