#!/bin/sh
set -e

BASE="${1:-/api}"
cd "$(dirname "$0")/.."

replace() {
  name="$1"
  url="$2"
  grep -rl "$url" src 2>/dev/null | while read -r file; do
    sed -i.bak "s#$url#$BASE/$name#g" "$file" && rm -f "$file.bak"
  done
}

replace auth "https://functions.poehali.dev/85275f0b-0f01-4c18-9133-e7e903ca579b"
replace chats "https://functions.poehali.dev/50b38462-4054-480e-85a6-3d1d593be5fb"
replace send-message "https://functions.poehali.dev/d2179cfe-604e-4dda-9a8e-94247336ffb6"
replace transcribe "https://functions.poehali.dev/9c47e0da-18f9-4bab-96c3-0531023fb5cc"
replace push "https://functions.poehali.dev/8415601d-6478-4ed7-947d-cfbee7dfbb93"

sed -i.bak '/cdn.poehali.dev\/intertnal\/js/d' index.html && rm -f index.html.bak

echo "Адреса функций заменены на $BASE/..."
if grep -rn "functions.poehali.dev" src; then
  echo "ВНИМАНИЕ: остались старые адреса, см. выше"
else
  echo "Остатков старых адресов нет"
fi
