# ADR-0001: Modular monolith, not microservices

Date: 2026-08-27
Status: accepted

## Context

The shop is a Kazan interior-door catalog with a kit configurator and a manager lead (no online payment). Traffic is a few visitors, one operator, one VPS.

A generic “senior” checklist suggests Kafka, Kubernetes, and service-per-domain. Those tools pay off after a team and a traffic problem exist. They cost ops load now.

## Decision

Keep one deployable: Next.js storefront + FastAPI + PostgreSQL + Redis behind Nginx/Caddy (Docker Compose). Layers inside the API:

- `routers/` — HTTP
- `services/` — quote, cart, catalog, orders, prices, notify
- `models.py` / Alembic — persistence
- `security.py` — auth

Scale later by replicating the **stateless** `api` and `web` containers. Cart and rate-limits already live in Redis; Postgres is the source of truth. Do not split “orders” or “catalog” into separate networks until a measured bottleneck exists.

## Consequences

- One `docker compose` file to reason about.
- Horizontal scale is “add replicas + sticky or Redis session”, not a mesh.
- Reject PRs that add brokers, k8s manifests, or a second database “for cleanliness”.
