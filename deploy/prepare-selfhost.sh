#!/bin/sh
# Подготавливает свою копию кода к сборке на сервере: убирает служебные скрипты платформы poehali.dev.
# Перед git pull откатите файл: git checkout -- src/platform
set -e
cd "$(dirname "$0")/.."
cat > src/platform/scripts.gen.ts <<'TS'
export const PLATFORM_META: {name: string; content: string; value: string}[] = [];

export const PLATFORM_SCRIPTS: {src: string; defer?: boolean}[] = [];
TS
echo "Служебные скрипты платформы отключены в этой копии"
