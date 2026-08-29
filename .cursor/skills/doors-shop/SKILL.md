---
name: doors-shop
description: >-
  Rules for the lending-web Kazan door shop (Next.js + FastAPI + Compose).
  Use when changing catalog, quote, cart, admin, deploy, or CI.
---

# Doors shop

Modular monolith. Do not introduce microservices, Kafka, Kubernetes, Flyway, or a payment gateway unless the user explicitly asks.

- Quote math lives in `apps/api/app/services/quote.py`.
- Schema changes go through Alembic, not `create_all` in `main.py`.
- Checkout is a lead (phone), not ЮKassa.
- Production is Compose + Caddy on one VPS; rollback is git SHA + `infra/deploy.sh`.
- Read `docs/ARCHITECTURE.md` and `docs/adr/` before large refactors.
