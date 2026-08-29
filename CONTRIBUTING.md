# Contributing

Магазин дверей, не платформа. Перед крупным PR прочитайте [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) и ADR.

## Локально

```bash
docker compose -f infra/docker-compose.yml up --build
cd apps/api && .venv/bin/pytest
cd apps/web && npm test
```

Интеграция (Postgres+Redis как в CI):

```bash
cd apps/api
RUN_INTEGRATION=1 DATABASE_URL=postgresql+asyncpg://doors:doors@localhost:5432/doors \
  REDIS_URL=redis://localhost:6379/0 .venv/bin/pytest -q
```

E2E (стек уже на http://localhost):

```bash
cd apps/web && E2E_BASE_URL=http://localhost npm run test:e2e
```

## Правила

- Бизнес-правила комплекта — в `app/services/quote.py`, не в React.
- Схема — новая ревизия Alembic, не `create_all` в `main`.
- Не добавлять Kafka, k8s, второй язык бэкенда «для резюме».
- Секреты не коммитить. `.env` в gitignore.

## CI

Lint → unit → coverage gate (utils/config/logging ≥ 80%) → integration → Trivy/Gitleaks. Падение coverage ниже порога стопорит merge.
