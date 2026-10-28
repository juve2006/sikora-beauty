---
id: adr-20261028-monobank-and-cash-on-delivery
type: adr
status: accepted
date: 2026-10-28
domains: []
paths:
  - "src/payments/**"
  - "src/orders/**"
summary: Card via monobank acquiring with Checkbox receipts, plus Nova Poshta cash on delivery
---
# Customers pay by card through monobank acquiring or cash on delivery through Nova Poshta

## Context

Ukrainian shoppers of cosmetics often prefer to pay on receipt; card payments on a site need a
fiscal receipt. monobank internet acquiring issues receipts through Checkbox configured in the
merchant cabinet, and its webhooks are signed. Source: spec `sikora-beauty`.

## Decision

- Card: monobank internet acquiring — an invoice, a redirect, a signed webhook, and a status
  request for reconciliation; fiscal receipts through Checkbox in the mono cabinet, with no code
  of ours.
- Cash on delivery: Nova Poshta.
- How cash-on-delivery payments get fiscal receipts is an open question for the accountant
  (spec `sikora-beauty`, open question 4).

## Alternatives

- **Card only** — rejected: lower conversion.
- **Cash on delivery only** — rejected: refused parcels cost delivery both ways.
- **LiqPay or WayForPay** — equivalent; monobank is the default and the final choice follows the
  owner's bank.

## Consequences

- The webhook handler must verify the signature, be idempotent and never move an order backwards;
  a cron reconciles invoices whose webhook never arrived.
- Cloudflare's WAF needs an exception for the webhook path.
