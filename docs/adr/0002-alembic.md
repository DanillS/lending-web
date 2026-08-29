# ADR-0002: Alembic, not Flyway

Date: 2026-08-27
Status: accepted

## Context

The API is Python. Flyway/Liquibase shine in JVM shops. Alembic is already in the image (`alembic upgrade head` on boot and in FastAPI lifespan).

## Decision

Version the schema only with Alembic under `apps/api/alembic/`. Seed stays idempotent in `app.services.seed`. Do not add a second migrator.

## Consequences

Schema changes are a new revision + review. `create_all` in app startup is forbidden; it belongs only inside an Alembic revision if needed.
