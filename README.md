# Магазин дверей

Витрина на Next.js, API на FastAPI, PostgreSQL 16, Redis, Nginx. Заявка менеджеру без онлайн-оплаты.

## Запуск локально

```bash
cp .env.example .env
# задайте SECRET_KEY и ADMIN_PASSWORD — не оставляйте changeme
chmod +x infra/backup.sh
docker compose -f infra/docker-compose.yml up --build
```

Откройте http://localhost

- Витрина: `/`, `/catalog`, карточка `/product/[slug]`
- Корзина и заявка: `/cart`, `/checkout`
- Админка: `/admin` (логин из `ADMIN_EMAIL` / `ADMIN_PASSWORD`)

Первый старт API сам накатывает схему, создаёт админа и загружает 73 двери из `data/products.json`.

## Деплой на сервер

1. Скопируйте репозиторий на VPS (Docker + Compose).
2. Создайте `.env` из `.env.example` и замените:
   - `SECRET_KEY` — длинная случайная строка
   - `ADMIN_PASSWORD` — свой пароль
   - `POSTGRES_PASSWORD`
   - `SITE_URL` и `NEXT_PUBLIC_SITE_URL` — `https://ваш-домен`
   - `CORS_ORIGINS` — тот же домен (без слеша в конце)
3. Соберите и запустите:

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

4. Повесьте HTTPS перед контейнером (Caddy/Nginx/Cloudflare) на порт 80 контейнера nginx или смените проброс на 127.0.0.1:80 и терминируйте TLS на хосте.
5. После смены домена пересоберите `web`, чтобы sitemap и Open Graph взяли `NEXT_PUBLIC_SITE_URL`.
6. Cron бэкапа: `0 3 * * * /path/to/lending-web/infra/backup.sh`
7. Telegram/email опциональны: заявка пишется в админку даже без них.

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
cd apps/api && pytest
cd apps/web && npm test
```

## Бэкап Postgres

```bash
./infra/backup.sh
```

Дамп появится в `backups/`.

## Массовые цены

В админке отметьте двери или включите «все по фильтру», укажите процент от **базовой** цены, нажмите «Превью», затем «Применить». «Отменить последний пересчёт» откатывает `current_price`.
