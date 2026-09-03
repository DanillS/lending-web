# Семь этапов — как это устроено здесь

Чеклист «Kafka + k8s + Canary + 80% на весь монолит» для витрины с заявкой вреден. Ниже — та же пирамида, урезанная под один VPS.

## 1. Архитектура

Модульный монолит, слои `routers` / `services` / `models`. Не микросервисы. Схема — Alembic, не Flyway. Брокера нет: Telegram после INSERT заявки. DaData — подсказки адреса и (опционально) cleaner телефона, таймаут 2.5 с, без ключа заявка жива. OpenAPI: `/docs` локально, `/openapi.json` всегда. C4 и ADR — в этой папке.

## 2. Тесты

| Слой | Где | CI |
| --- | --- | --- |
| Unit | `apps/api/tests/test_{utils,quote,config,logging}.py`, vitest | да, coverage ≥ 80% на utils/config/logging |
| Integration | `test_integration.py` + Postgres/Redis services | да, `RUN_INTEGRATION=1` |
| E2E | Playwright `apps/web/e2e` | локально, `E2E_BASE_URL` |
| Load | `infra/locustfile.py` | нет (ломает чужой CI и сам сайт) |
| Mutation | — | нет, слишком дорого на 73 SKU |

## 3. CI/CD

GitHub Actions: ruff → pytest+cov → integration → vitest → Playwright smoke (`https://elite-doors.shop`) → Gitleaks → Trivy. CodeQL отдельно. Deploy — `infra/deploy.sh --env-file`, не Argo. Dependabot weekly.

## 4. Безопасность

SAST: CodeQL. SCA/контейнеры: Trivy fs. Секреты: Gitleaks. Rate limit логина. Слабые секреты не стартуют в `APP_ENV=production`. DAST/ZAP и Checkov/k8s — когда появится отдельный staging, не раньше.

## 5. Наблюдаемость

JSON-логи в production, `X-Request-ID`. `/health`, `/health/live`, `/health/ready`. Sentry — если задан `SENTRY_DSN`. Prometheus/Grafana/Jaeger на одном хосте не ставим: Caddy + `docker logs` + Uptime на `/health/ready`.

## 6. Надёжность

Бэкап Postgres+uploads, restore, runbook, rollback по git SHA. Chaos — «docker stop api» на копии, не Gremlin.

## 7. Документы

README, CONTRIBUTING, ARCHITECTURE, API, RUNBOOK, ROLLBACK, ADR, MCP.
