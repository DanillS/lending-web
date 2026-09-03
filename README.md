# Магазин дверей

Витрина на Next.js, API на FastAPI, PostgreSQL 16, Redis, Nginx. Заявка менеджеру без онлайн-оплаты.

## Запуск локально

```bash
cp .env.example .env
chmod +x infra/*.sh
docker compose -f infra/docker-compose.yml up --build
```

Откройте http://localhost

- Витрина: `/`, `/catalog`, карточка `/product/[slug]`
- Корзина и заявка: `/cart`, `/checkout`
- Админка: `/admin` (логин из `ADMIN_EMAIL` / `ADMIN_PASSWORD`). PWA: в шапке «Включить уведомления»; на iPhone сначала «На экран Домой».
- Живость: `/health` · готовность (Postgres + Redis): `/health/ready`

Первый старт API накатывает Alembic, создаёт админа и загружает 73 двери из `data/products.json`.

## Деплой на VPS (не Vercel)

Стек — Docker Compose. На Vercel он не встанет: нужны Postgres, Redis и FastAPI. Домен (`elite-doors.shop`) должен смотреть A-записью на IP VPS, не на Vercel.

1. Ubuntu VPS, Docker + Compose v2.24+, Caddy.
2. Клон в `/opt/lending-web`, `.env` из `.env.example`.
3. Секреты:

```bash
./infra/gen-secrets.sh
```

В `.env` на сервере:

- `APP_ENV=production`
- `SECRET_KEY`, `ADMIN_PASSWORD`, `POSTGRES_PASSWORD` — из скрипта, не дефолты
- `SITE_URL` и `NEXT_PUBLIC_SITE_URL` — `https://elite-doors.shop`
- `CORS_ORIGINS` — тот же домен без слеша
- `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` — иначе заявки только в админке и в PWA-пуше. На VPS: `./infra/enable-telegram.sh "<token>" "<chat_id>"`
- `DADATA_API_KEY` — подсказки адреса на `/checkout` (бесплатный ключ в [кабинете DaData](https://dadata.ru/profile/#info)). Без ключа адрес всё равно можно вписать руками. `DADATA_SECRET` — нормализация телефона через платный cleaner; без него телефон чистится локально.

4. Стек (nginx только на `127.0.0.1:8080`):

```bash
./infra/deploy.sh
```

Или вручную:

```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d --build
```

5. HTTPS на хосте (Let's Encrypt сам):

```bash
export SITE_DOMAIN=elite-doors.shop
caddy run --config /opt/lending-web/infra/Caddyfile
```

Caddy слушает 443 и проксирует на `127.0.0.1:8080`. Порт 80 контейнера в интернет не публикуется.

6. Файрвол: `sudo ./infra/ufw.sh` (SSH + 80/443, без публикации Compose `:80`).
7. После смены `NEXT_PUBLIC_SITE_URL` обязательно пересобрать `web` (это делает `deploy.sh`) — sitemap и Open Graph запекаются в билд.
8. Cron бэкапа: `0 3 * * * /opt/lending-web/infra/backup.sh`
9. Внешний пинг (Uptime Kuma / healthchecks.io) на `https://домен/health/ready`, алерт в Telegram.

Фото дверей сейчас лёгкие webp 280–360 px из старого каталога. Перед продакшеном лучше залить нормальные кадры через админку (webp/jpeg/png до 5 МБ).

## Локальная разработка без Docker (API)

Нужны PostgreSQL и Redis. Затем:

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
export DATABASE_URL=postgresql+asyncpg://doors:doors@localhost:5432/doors
uvicorn app.main:app --reload --port 8000
```

Фронт:

```bash
cd apps/web
npm install
INTERNAL_API_URL=http://localhost:8000 npm run dev
```

## Тесты

```bash
cd apps/api && pip install -r requirements-dev.txt && pytest
cd apps/web && npm test
# E2E, стек уже на :80
cd apps/web && E2E_BASE_URL=http://localhost npx playwright install chromium && npm run test:e2e
# Нагрузка (не в CI)
pip install locust && locust -f infra/locustfile.py --headless -u 20 -r 5 -t 30s --host http://localhost
```

CI: lint (ruff) → unit + coverage ≥80% (utils/config/logging) → integration (Postgres+Redis) → Trivy + Gitleaks. CodeQL отдельно. Dependabot — weekly.

Документы: [как устроена инженерия](docs/ENGINEERING.md), [архитектура](docs/ARCHITECTURE.md), [API](docs/API.md), [runbook](docs/RUNBOOK.md), [откат](docs/ROLLBACK.md), [MCP](docs/MCP.md), [CONTRIBUTING](CONTRIBUTING.md).

## Массовые цены

```bash
./infra/backup.sh
# опционально наружу:
# BACKUP_REMOTE=user@host:/backups/doors ./infra/backup.sh
```

Пишет `backups/doors-*.sql.gz` и `backups/uploads-*.tar.gz`, старше 14 дней удаляет (`BACKUP_KEEP_DAYS`).

Проверка restore на копии:

```bash
./infra/restore.sh backups/doors-YYYYMMDD-HHMMSS.sql.gz backups/uploads-YYYYMMDD-HHMMSS.tar.gz
```

## Массовые цены

В админке отметьте двери или включите «все по фильтру», укажите процент от **базовой** цены — список «Будет обновлено» меняется сразу, затем нажмите «Применить». «Отменить последний пересчёт» откатывает `current_price`.
