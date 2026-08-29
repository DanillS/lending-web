# Откат

Один хост, без Canary. Откат = предыдущий git + тот же Compose.

```bash
cd /opt/lending-web
git fetch
git log -5 --oneline
git checkout <known-good-sha>
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d --build
curl -sS https://домен/health/ready
```

Схема БД только вперёд через Alembic. Откат кода на ревизию **старше** текущей БД может сломать API — тогда либо `alembic downgrade` (если ревизия это умеет), либо restore:

```bash
./infra/restore.sh backups/doors-….sql.gz backups/uploads-….tar.gz
```

Образы не тегируются отдельно: «предыдущая версия» = git SHA, который уже гоняли. Перед рискованным релизом снять `./infra/backup.sh`.
