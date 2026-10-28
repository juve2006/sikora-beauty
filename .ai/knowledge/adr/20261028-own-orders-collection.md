---
id: adr-20261028-own-orders-collection
type: adr
status: accepted
date: 2026-10-28
domains: []
paths:
  - "src/orders/**"
summary: Own orders collection; Payload ecommerce plugin rejected (beta, CVE-2026-105850)
---
# Orders are a small Payload collection of our own, not Payload's ecommerce plugin

## Context

Payload offers `@payloadcms/plugin-ecommerce` (carts, orders, transactions, payment adapters).
On 2026-10-28 it is still marked beta in the v3 and v4 docs, its only built-in payment adapter is
Stripe, and CVE-2026-105850 (October 2026) let an order confirmation be processed more than once.
The store needs monobank and cash on delivery, not Stripe. Source: spec `sikora-beauty`.

## Decision

Orders live in our own `orders` collection: a snapshot of names and prices at checkout, customer
contacts, the Nova Poshta warehouse, the payment method and a status that only moves forward.
Payment and delivery integrations write to it through their own modules.

## Alternatives

- **Payload ecommerce plugin** — rejected: beta, a recent double-confirmation CVE on the money
  path, and a custom payment adapter would be needed anyway.

## Consequences

- We own the order state machine; its forward-only transitions and idempotency need tests.
- Revisit once the plugin is stable and the store needs carts across devices or promotions.
