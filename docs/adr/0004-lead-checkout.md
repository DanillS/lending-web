# ADR-0004: Lead checkout, no payment gateway

Date: 2026-08-27
Status: accepted

## Context

The business model is a callback from a manager. ЮKassa was explicitly out of scope.

## Decision

Cart → заявка with phone. No card data, no PCI. Revisit only with a written requirement.

## Consequences

Checkout tests assert order numbers and notify hooks, not payment intents.
