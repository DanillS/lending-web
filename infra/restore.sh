#!/bin/sh
set -eu
# Restore a dump from ./backups onto the running Compose stack.
# Usage:
#   ./infra/restore.sh backups/doors-YYYYMMDD-HHMMSS.sql.gz [backups/uploads-YYYYMMDD-HHMMSS.tar.gz]

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_BASE="$ROOT/infra/docker-compose.yml"
ENV_FILE="$ROOT/.env"

if [ "${1:-}" = "" ]; then
  echo "Usage: $0 backups/doors-….sql.gz [backups/uploads-….tar.gz]" >&2
  exit 1
fi

SQL="$1"
UPLOADS="${2:-}"

compose() {
  if [ -f "$ENV_FILE" ]; then
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_BASE" "$@"
  else
    docker compose -f "$COMPOSE_BASE" "$@"
  fi
}

echo "Restoring Postgres from $SQL"
gzip -dc "$SQL" | compose exec -T postgres \
  psql -U "${POSTGRES_USER:-doors}" -d "${POSTGRES_DB:-doors}"

if [ -n "$UPLOADS" ]; then
  echo "Restoring uploads from $UPLOADS"
  cat "$UPLOADS" | compose exec -T api tar -C /app/uploads -xzf -
fi

echo "Restore finished. Spot-check /health/ready and a product photo."
