# Качественные двери

Витрина дверей в Казани: Next.js + FastAPI + PostgreSQL + Redis. Заявка менеджеру, без онлайн-оплаты.

Сайт: https://elite-doors.shop

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up --build
```

http://localhost — витрина, `/admin` — админка.

Полная инструкция для разработки, деплоя и агента: **[AGENTS.md](AGENTS.md)**.
