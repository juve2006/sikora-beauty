---
id: adr-20261028-next-payload-single-app
type: adr
status: accepted
date: 2026-10-28
domains: []
paths:
  - "src/**"
  - "next.config.*"
summary: One Next.js app with Payload CMS inside, on Postgres; Horoshop and Nuxt+Medusa rejected
reviewed_at: 2026-10-28
---
# The store is one Next.js application with Payload CMS inside it, on Postgres

## Context

The store sells seven professional skincare brands. Its requirements are mostly catalog, content
and filters: a product carries a dozen rich fields (purpose and effect, actives with their role,
usage, warnings, INCI), and skin type, skin condition and skin concern work as filters. The people
who run it day to day — the owner and the cosmetologist — are not technical and need an admin in
Ukrainian. One developer builds and maintains it in spare time. Source: spec `sikora-beauty`.

## Decision

One Next.js (App Router) application with Payload CMS 3 embedded: the storefront, the admin
(`/admin`), the API and the integrations live in one repository, one process and one Docker image,
on one Postgres database. Frontend and backend are separated by folders, not by services.

## Alternatives

- **Horoshop (Ukrainian SaaS)** — Nova Poshta, payments, fiscal receipts and filters out of the
  box, launch in weeks; rejected because the care finder and custom UX are limited and it carries
  a monthly fee. It stays the fallback if development stops.
- **Nuxt + Medusa v2** — a mature commerce core with an order admin; rejected because it means
  3–4 services to deploy and the rich product content would need extra work or a separate CMS.
- **A separate backend service** — a second deployment and a network seam with no need at this
  size.

## Consequences

- Payload turns collection definitions into the admin, the database schema and the API; content
  modelling is cheap.
- Commerce (cart, orders, payment, delivery) is our own code — see
  adr-20261028-own-orders-collection.
- One Docker image and plain Postgres keep hosting replaceable.
- Next.js and Payload security releases must be applied promptly; they ship together.
