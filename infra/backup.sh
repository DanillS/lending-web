#!/bin/sh
set -eu
# Usage: ./infra/backup.sh
# Requires docker compose stack running. Dumps Postgres into ./backups/

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$ROOT/backups/doors-$STAMP.sql.gz"

docker compose -f "$ROOT/infra/docker-compose.yml" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-doors}" "${POSTGRES_DB:-doors}" | gzip > "$FILE"

echo "Wrote $FILE"
