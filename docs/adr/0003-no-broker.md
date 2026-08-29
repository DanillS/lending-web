# ADR-0003: No message broker

Date: 2026-08-27
Status: accepted

## Context

Checkout already writes the order, then calls Telegram/email in-process (`notify.notify_order`). Volume is a handful of leads per day. Kafka/RabbitMQ would add a cluster to babysit for a fire-and-forget HTTP call.

## Decision

Keep notify synchronous and failure-tolerant (log + continue). If Telegram starts timing out under real load, extract a Redis queue **inside this repo**, not a Kafka cluster.

## Consequences

A lost Telegram send is an ops issue (retry from admin), not a distributed transaction. Do not block checkout on the messenger.
