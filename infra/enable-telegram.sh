#!/bin/sh
set -eu
# Write TELEGRAM_* into .env, verify the bot, recreate api so env is picked up.
# Usage (on the VPS): ./infra/enable-telegram.sh "<bot_token>" "<chat_id>"
# Chat id: message the bot, then https://api.telegram.org/bot<token>/getUpdates

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
TOKEN="${1:-}"
CHAT="${2:-}"

if [ -z "$TOKEN" ] || [ -z "$CHAT" ]; then
  echo "Usage: $0 <TELEGRAM_BOT_TOKEN> <TELEGRAM_CHAT_ID>" >&2
  exit 1
fi
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

me="$(curl -sS "https://api.telegram.org/bot${TOKEN}/getMe")"
echo "$me" | grep -q '"ok":true' || {
  echo "getMe failed: $me" >&2
  exit 1
}

python3 - "$ENV_FILE" "$TOKEN" "$CHAT" <<'PY'
import re, sys
path, token, chat = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(path, encoding="utf-8").read()

def upsert(body: str, key: str, value: str) -> str:
    line = f"{key}={value}"
    pat = re.compile(rf"^{re.escape(key)}=.*$", re.M)
    if pat.search(body):
        return pat.sub(line, body, count=1)
    return body.rstrip() + "\n" + line + "\n"

text = upsert(text, "TELEGRAM_BOT_TOKEN", token)
text = upsert(text, "TELEGRAM_CHAT_ID", chat)
open(path, "w", encoding="utf-8").write(text)
PY

ping="$(curl -sS -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  -H 'Content-Type: application/json' \
  --data "{\"chat_id\":\"${CHAT}\",\"text\":\"lending-web: Telegram подключен\"}")"
echo "$ping" | grep -q '"ok":true' || {
  echo "sendMessage failed (write /start to the bot first): $ping" >&2
  exit 1
}

if [ -f "$ROOT/infra/docker-compose.prod.yml" ]; then
  docker compose --env-file "$ENV_FILE" \
    -f "$ROOT/infra/docker-compose.yml" \
    -f "$ROOT/infra/docker-compose.prod.yml" \
    up -d --force-recreate --no-deps api
fi

echo "Telegram env written. Check /health/ready → telegram true, then place a test order."
