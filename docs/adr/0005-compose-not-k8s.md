# ADR-0005: Compose + Caddy on one VPS, not Kubernetes

Date: 2026-08-27
Status: accepted

## Context

Canary, Argo Rollouts, and service meshes need a cluster. This product has one production host.

## Decision

Progressive delivery = `git` on the VPS + Compose recreate. Rollback = previous image/tag or `git checkout` + `compose up`. TLS on host Caddy. Do not add Helm/k8s until there are multiple hosts.

## Consequences

CI builds and tests; deploy stays a documented script (`infra/deploy.sh`). Chaos engineering is “stop a container on staging”, not Gremlin.
