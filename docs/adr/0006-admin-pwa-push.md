# ADR-0006: Admin PWA + Web Push, keep Telegram

Date: 2026-08-27
Status: accepted

## Context

Managers want a phone notification for a new lead without depending only on Telegram. A second microservice or FCM admin SDK is too much for one shop.

## Decision

The admin UI is an installable PWA. Web Push (VAPID) is sent in-process from `notify.notify_order`, same as Telegram. Subscriptions live in Postgres. No extra container.

## Consequences

HTTPS (or localhost) is required. iOS delivers push only after «На экран Домой». Telegram stays the fallback when the browser is not subscribed.
