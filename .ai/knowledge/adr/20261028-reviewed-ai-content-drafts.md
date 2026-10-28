---
id: adr-20261028-reviewed-ai-content-drafts
type: adr
status: accepted
date: 2026-10-28
domains: []
paths:
  - "src/catalog/**"
summary: Imported + AI-drafted content published only after review; INCI only from a source
---
# Product content is imported, drafted by AI and published only after the cosmetologist's review; INCI comes only from a source

## Context

The public source (cosmetika.com.ua) has base data for three of the seven brands — name, SKU,
price, photos, a short description — and none of the rich fields. Hundreds of products times a
dozen fields, in two languages, is weeks of typing. Wrong content on cosmetics is costly: an
invented ingredient list can hide an allergen, and medical claims get Google Ads disapproved.
Source: spec `sikora-beauty`.

## Decision

- Base data is imported (Store API, distributor CSV/XLSX) as drafts.
- Rich fields and English translations are drafted by AI from official brand material.
- A product is published only after the cosmetologist reviews it (Payload drafts).
- INCI is copied from a source — packaging, brand or distributor — with the source recorded; AI
  never generates it.
- Texts describe cosmetic effects; no medical claims.

## Alternatives

- **Everything by hand** — rejected: weeks before launch.
- **Publishing AI drafts directly** — rejected: errors reach shoppers and Ads review.

## Consequences

- The cosmetologist's review time is the launch bottleneck; brands launch as they are ready.
- The admin must show which drafts come from AI and are waiting for review.
