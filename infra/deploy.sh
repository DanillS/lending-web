#!/bin/sh
set -eu
# Production bring-up on a VPS. Run from anywhere; uses this repo as ROOT.
# Usage: APP_ENV=production ./infra/deploy.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_BASE="$ROOT/infra/docker-compose.yml"
COMPOSE_PROD="$ROOT/infra/docker-compose.prod.yml"
ENV_FILE="$ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — copy .env.example and fill production values." >&2
  exit 1
fi

require_env() {
  key="$1"
  val="$(awk -F= -v k="$key" '$1==k { sub(/^[^=]+=/, ""); print; exit }' "$ENV_FILE")"
  if [ -z "$val" ]; then
    echo "Set $key in .env" >&2
    exit 1
  fi
}

weak() {
  key="$1"
  val="$(awk -F= -v k="$key" '$1==k { sub(/^[^=]+=/, ""); print; exit }' "$ENV_FILE")"
  case "$val" in
    ""|changeme|change-me-to-a-long-random-string|dev-secret-change-me|doors)
      echo "$key is still a default/weak value" >&2
      exit 1
      ;;
  esac
}

require_env SITE_URL
require_env NEXT_PUBLIC_SITE_URL
require_env CORS_ORIGINS
app_env="$(awk -F= '$1=="APP_ENV" { sub(/^[^=]+=/, ""); print; exit }' "$ENV_FILE")"
if [ "$app_env" != "production" ] && [ "$app_env" != "prod" ]; then
  echo "Set APP_ENV=production in .env" >&2
  exit 1
fi
weak SECRET_KEY
weak ADMIN_PASSWORD
weak POSTGRES_PASSWORD

site="$(awk -F= '$1=="SITE_URL" { sub(/^[^=]+=/, ""); print; exit }' "$ENV_FILE")"
case "$site" in
  https://*) ;;
  *)
    echo "SITE_URL must be https://… in production (got: $site)" >&2
    exit 1
    ;;
esac

echo "Building and starting production stack (nginx on 127.0.0.1:8080)…"
# Compose reads interpolation from the project dir (infra/), not the repo .env, unless we pass --env-file.
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_BASE" -f "$COMPOSE_PROD" up -d --build
echo
echo "Point Caddy at 127.0.0.1:8080 using $ROOT/infra/Caddyfile"
echo "DNS A-record for the domain must target this VPS, not Vercel."
echo "After changing NEXT_PUBLIC_SITE_URL, this script already rebuilds web."
