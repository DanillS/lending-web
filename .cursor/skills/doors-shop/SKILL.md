---
name: doors-shop
description: >-
  Rules for the lending-web Kazan door shop (Next.js + FastAPI + Compose).
  Use when changing catalog, quote, cart, admin, deploy, or CI.
---

Читай [AGENTS.md](../../../AGENTS.md) в корне репозитория. Других docs нет.

Не добавляй микросервисы, Kafka, Kubernetes, Flyway и платёжку, пока владелец явно не попросил.
Quote — `apps/api/app/services/quote.py`. Схема — только Alembic. Checkout — лид, не ЮKassa. Прод — Compose + Caddy, откат git SHA + `infra/deploy.sh`.
