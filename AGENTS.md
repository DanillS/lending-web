# Качественные двери (lending-web)

Один файл для агента и человека. Других docs/ADR/CONTRIBUTING нет — не ищите их.

Живой сайт: **https://elite-doors.shop**  
Репозиторий: https://github.com/DanillS/lending-web  
Прод: Ubuntu VPS Timeweb, путь `/opt/lending-web`, IP `195.19.199.135`, домен A-записью на этот IP (не Vercel).

## Что это

Магазин межкомнатных дверей в Казани. Покупатель собирает комплект (полотно / коробка / наличники / фурнитура / услуги), кладёт в корзину, оставляет **заявку с телефоном**. Менеджер перезванивает. Онлайн-оплаты нет.

Стек: Next.js 15 (витрина + админка) + FastAPI + PostgreSQL 16 + Redis + Nginx в Docker Compose. Снаружи Caddy (HTTPS). Модульный монолит, один git, один хост.

## Жёсткие правила

Не добавлять, пока владелец явно не попросил: микросервисы, Kafka/Rabbit, Kubernetes, Helm, Flyway, платёжный шлюз (ЮKassa и т.п.), Prometheus/Grafana/ELK на этом VPS.

- Математика комплекта — только `apps/api/app/services/quote.py`, не в React.
- Схема БД — новая ревизия Alembic в `apps/api/alembic/versions/`. Запрещён `create_all` в `main.py`.
- Checkout — лид (телефон + опционально адрес), не оплата.
- Прод — Compose + Caddy. Откат: `git checkout <sha>` + `infra/deploy.sh`.
- Секреты не коммитить. `.env` в `.gitignore`. Канонический прод-`.env` лежит **на сервере**, не на Mac.
- Новую фичу класть в `services/`, роутер только валидирует вход и отдаёт HTTP.

## Каталоги

```
apps/api/          FastAPI
  app/routers/     HTTP
  app/services/    quote, cart, orders, catalog, prices, notify, dadata, push, seed
  app/models.py    SQLAlchemy
  alembic/         миграции 0001…0004
  tests/
apps/web/          Next.js App Router
  src/app/(site)/  витрина
  src/app/admin/   админка (PWA)
  e2e/             Playwright
infra/             Compose, Caddy, nginx, deploy/backup/SSH
data/products.json seed ~73 дверей
public/            фото для образа web
```

Маршруты витрины: `/`, `/catalog`, `/product/[slug]`, `/cart`, `/checkout`, `/delivery`, `/legal`.  
Админка: `/admin` (товары, заявки, массовые цены). Логин: `ADMIN_EMAIL` / `ADMIN_PASSWORD` из `.env` — пароль читается **только при первом seed**.

## Поток заявки

1. `POST /api/v1/quote` — расчёт комплекта (`quote.py`).
2. `POST /api/v1/cart/items` — cookie `cart_id`.
3. `POST /api/v1/orders` — honeypot + rate limit, снимок суммы. Если цена в корзине устарела — 409.
4. После INSERT: `notify.notify_order` — Telegram (если токены есть **и** сеть до `api.telegram.org` жива) и Web Push подписчикам админки. Ошибка мессенджера **не откатывает** заявку.
5. Адрес (опционально) пишется в `orders.address`. Телефон нормализуется в `+7…` (`dadata.resolve_phone` → локальный fallback).

Корзины покупателей без аккаунта. Админ — JWT в cookie (`access_token` / `refresh_token`).

## HTTP API

Источник правды: `GET /openapi.json`. Локально ещё `/docs`. На проде UI `/docs` выключен.

Публичное: `/health`, `/health/live`, `/health/ready` (Postgres+Redis; флаги `telegram`, `web_push`, `dadata` информативные),  
`/api/v1/products`, `/products/{slug}`, `/quote`, `/handles`, `/cart`, `/cart/items`, `/orders`,  
`/suggest/address`, `/phone/normalize`, `/site`.

Админка `/api/v1/admin`: логин, CRUD товаров, фото, массовые цены, заявки.  
Push: `GET /push/vapid`, `POST /push/subscribe|unsubscribe|test`.

`/health/ready` → 503 только если нет Postgres или Redis.

## Интеграции

| Что | Зачем | Если нет ключа |
| --- | --- | --- |
| DaData Suggest | подсказки адреса на checkout, буст Казани | поле — обычный текст, заявка жива |
| DaData Cleaner | телефон, нужен `DADATA_SECRET` | локальный `normalize_phone` |
| Telegram Bot API | текст заявки менеджеру | заявка в `/admin/orders` |
| Web Push / VAPID | пуш в браузер админки | то же |
| Caddy + Let's Encrypt | TLS | — |

Ключ DaData на сервере не отдавать в браузер: витрина бьёт в наш API.

**Прод, сеть:** с этого VPS (и часто с домашнего Wi‑Fi в РФ) `api.telegram.org:443` таймаутится. Токены в `.env` могут стоять (`/health/ready` → `"telegram": true`), сообщения всё равно не уходят. Нужен прокси/WARP или разблокировка у хостера. DaData с VPS ходит нормально.

**Прод, витрина:** образ `web` может быть старше API. Тогда `/checkout` без поля адреса, хотя `POST /api/v1/suggest/address` уже работает. Сборка Next.js на 4 ГБ RAM вешает хост — **не собирать `api` и `web` параллельно**. Сначала `build api`, потом `build web`, потом `up`. Диск ~10 ГБ.

## Локально

```bash
cp .env.example .env
chmod +x infra/*.sh
docker compose -f infra/docker-compose.yml up --build
```

http://localhost — витрина на `:80`. Первый старт API: Alembic + админ + seed из `data/products.json`.

Без Docker: Postgres+Redis, `apps/api` → `uvicorn app.main:app --reload --port 8000`, `apps/web` → `INTERNAL_API_URL=http://localhost:8000 npm run dev`.

## Тесты и CI

```bash
cd apps/api && pip install -r requirements-dev.txt && pytest
# integration как в CI:
RUN_INTEGRATION=1 DATABASE_URL=postgresql+asyncpg://doors:doors@localhost:5432/doors \
  REDIS_URL=redis://localhost:6379/0 pytest tests/test_integration.py --no-cov
cd apps/web && npm test
E2E_BASE_URL=http://localhost npm run test:e2e   # стек уже поднят
```

GitHub Actions (`.github/workflows/ci.yml`): ruff → unit+coverage ≥80% на `utils`/`config`/`logging` (плюс `test_quote`, `test_notify`, `test_dadata`) → integration (Postgres+Redis services) → vitest → Playwright smoke на **живой** `https://elite-doors.shop` → Gitleaks → Trivy HIGH/CRITICAL. CodeQL отдельно. Dependabot weekly.

Деплоя из Actions нет: после зелёного CI человек на VPS делает `git pull` и `./infra/deploy.sh`.

Не добавлять в CI Locust/Gatling по живому магазину.

## Прод

`.env` на сервере:

- `APP_ENV=production`
- сильные `SECRET_KEY`, `ADMIN_PASSWORD`, `POSTGRES_PASSWORD` (`./infra/gen-secrets.sh`)
- `SITE_URL` и `NEXT_PUBLIC_SITE_URL` = `https://elite-doors.shop` без слеша
- `CORS_ORIGINS` — тот же домен
- опционально Telegram, DaData, `SENTRY_DSN`

Compose читает интерполяцию из каталога `infra/`. Скрипты обязаны передавать `--env-file /opt/lending-web/.env`, иначе в контейнеры уйдёт пароль `doors` и API не стартует.

```bash
# на VPS
cd /opt/lending-web && git pull --ff-only
# при нехватке RAM — не deploy.sh целиком, а по очереди:
docker compose --env-file /opt/lending-web/.env \
  -f infra/docker-compose.yml -f infra/docker-compose.prod.yml build api
docker compose --env-file /opt/lending-web/.env \
  -f infra/docker-compose.yml -f infra/docker-compose.prod.yml build web
./infra/deploy.sh
```

`docker-compose.prod.yml`: nginx только `127.0.0.1:8080`. Caddy на хосте: `infra/Caddyfile` → этот порт. UFW: `infra/ufw.sh` (SSH/80/443).

После смены `NEXT_PUBLIC_SITE_URL` обязательно пересобрать `web` (sitemap/OG в билде).

Cron: `0 3 * * * /opt/lending-web/infra/backup.sh`  
Бэкап: `backups/doors-*.sql.gz` + `uploads-*.tar.gz`, ротация 14 дней. Restore: `infra/restore.sh`. С Mac: `scp 'root@IP:/opt/lending-web/backups/doors-*.sql.gz' ~/elite-doors-backups/` (кавычки, иначе zsh раскроет `*` локально).

SSH: с Mac `infra/install-ssh-key.sh root@IP`, на сервере `infra/harden-ssh.sh` (пароль выключен).

Caddy: `systemctl`, конфиг `/opt/lending-web/infra/Caddyfile`. После apt-установки Caddy перезапустить, иначе крутится дефолтный welcome.

## Откат

```bash
cd /opt/lending-web
git log -5 --oneline
git checkout <known-good-sha>
# --env-file обязателен
docker compose --env-file /opt/lending-web/.env \
  -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d --build
```

Схема только вперёд. Откат кода старше текущей БД может сломать API → `alembic downgrade` или `restore.sh`. Перед рискованным релизом снять бэкап. Образы не тегируются: версия = git SHA.

## Runbook

Сайт лежит: `curl https://elite-doors.shop/health` → `{"status":"ok"}`; `/health/ready` — postgres/redis true. 503 ready — логи postgres/redis/api. Health 200, HTML 502 — логи web/nginx; после смены IP api перезапустить nginx.

Telegram молчит: нет токенов, или блок `api.telegram.org`, или боту не писали `/start`. Заявка всё равно в админке.

Адрес не подсказывается: нет `DADATA_API_KEY` или крутится старый образ web. Ключ: https://dadata.ru/profile/#info , пересоздать `api`.

Пуш: только HTTPS (или localhost). iPhone — «На экран Домой», затем включить. Ключи VAPID сами в БД при первой подписке, если не заданы в `.env`.

401 после деплоя: сменили `SECRET_KEY`. Пароль админа из `.env` не обновляет уже созданного пользователя.

Диск: логи json-file 10m×3; `docker system prune`; бэкапы чистит `backup.sh`. Не собирать два образа сразу.

Брутфорс `/admin/login`: nginx 5 r/m + Redis 10 / 15 мин.

## Решения (коротко)

1. Модульный монолит, не микросервисы. Масштаб — реплики stateless `web`/`api`, Redis уже для корзины и лимитов.
2. Alembic, не Flyway. Seed идемпотентный в `seed.py`.
3. Без брокера: notify после INSERT, checkout не ждёт Telegram.
4. Checkout = лид, не касса. Карты и PCI не тащить без письменной задачи.
5. Один VPS, Compose + Caddy, не k8s.
6. Админка — PWA + Web Push в том же процессе, что Telegram.

## SEO (уже в коде, не «продвижение»)

`metadata` + Open Graph, canonical, `robots.ts` (не индексировать `/admin` `/cart` `/checkout`), `sitemap.ts` + `/api/v1/sitemap.xml`, JSON-LD LocalBusiness. Нет Search Console / уникальных текстов / Product schema — не добавлять, пока не попросили.

## Массовые цены

В админке: процент от **базовой** цены, превью, «Применить». «Отменить последний пересчёт» откатывает `current_price`. Перед массовым прогоном на проде — `backup.sh`.

## Скрипты `infra/`

`deploy.sh`, `gen-secrets.sh`, `backup.sh`, `restore.sh`, `enable-telegram.sh`, `install-ssh-key.sh`, `harden-ssh.sh`, `ufw.sh`, `Caddyfile`, `docker-compose.yml` + `docker-compose.prod.yml`.

## MCP (Cursor)

`.cursor/mcp.json`: Playwright; GitHub — токен в настройках MCP, не в git. Postgres/Redis прода в MCP не подключать.

## Как говорить о проекте

«Свой магазин дверей: Next + FastAPI + Postgres в Compose на VPS. CI в GitHub Actions. Деплой скриптом, TLS Caddy. Заявка-лид, DaData, Telegram/Web Push. Kubernetes не ставил: один хост.»
