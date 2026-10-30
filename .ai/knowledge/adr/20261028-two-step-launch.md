---
id: adr-20261028-two-step-launch
type: adr
status: accepted
date: 2026-10-28
domains: []
paths:
  - src/lib/actions/order.actions.ts
  - src/lib/monobank.ts
summary: "Launch 1: manager-confirmed orders; launch 2: online payment, only for orders fully in stock"
---
# The store launches in two steps, and online payment is offered only for orders fully in stock

## Context

The longest path to launch is content, not code. Stock is mixed: some products are held, some are
ordered from the distributor per order, and availability is set by hand. An independent failure
hunt ranked "paid by card, item not in stock" first: it costs a refund, a refund receipt and the
customer. Source: spec `sikora-beauty`.

## Decision

- **Step 1 (public launch):** catalog, cart and guest checkout. An order is confirmed by a manager
  before payment; the customer pays cash on delivery or through a monobank payment link the
  manager sends.
- **Step 2:** online card payment on the site and Nova Poshta waybills from the admin.
- Online card payment is offered only when every order line is in stock; an order with a
  made-to-order line goes through manager confirmation.

## Alternatives

- **One launch with everything** — rejected: the first customer and SEO arrive later, and the
  riskiest code (webhooks, fiscal receipts) blocks the launch.
- **Online payment for any order** — rejected: it produces refunds and refund receipts whenever
  manual availability is wrong.

## Consequences

- Step 1 needs a person to confirm each order; Telegram notifications make that fast.
- The checkout must know each line's availability status at order time.
