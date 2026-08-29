#!/bin/sh
set -eu
# Dump Postgres + product photos. Optional offsite: BACKUP_REMOTE=user@host:/path
# Usage: ./infra/backup.sh
# Cron: 0 3 * * * /opt/lending-web/infra/backup.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_BASE="$ROOT/infra/docker-compose.yml"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
DIR="$ROOT/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$DIR"

compose() {
  docker compose -f "$COMPOSE_BASE" "$@"
}

SQL="$DIR/doors-$STAMP.sql.gz"
UPLOADS="$DIR/uploads-$STAMP.tar.gz"

compose exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-doors}" "${POSTGRES_DB:-doors}" | gzip > "$SQL"

compose exec -T api tar -C /app/uploads -czf - . > "$UPLOADS"

echo "Wrote $SQL"
echo "Wrote $UPLOADS"

find "$DIR" -type f \( -name 'doors-*.sql.gz' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete

if [ -n "${BACKUP_REMOTE:-}" ]; then
  rsync -a --delete "$DIR/" "$BACKUP_REMOTE"
  echo "Synced to $BACKUP_REMOTE"
fi
