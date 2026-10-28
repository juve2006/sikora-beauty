---
id: adr-20261028-postgres-search
type: adr
status: accepted
date: 2026-10-28
domains: []
paths:
  - "src/search/**"
summary: "Search in Postgres: pg_trgm, unaccent, synonyms; no external search service"
---
# Search runs in Postgres with pg_trgm, unaccent and a synonyms table

## Context

The catalog is expected to stay at a few hundred products. Shoppers type brand names in Latin or
Cyrillic ("dr spiller", "доктор шпіллер"), with typos, and search by active ingredient. Source:
spec `sikora-beauty`.

## Decision

Search runs in the store's Postgres: `pg_trgm` similarity, `unaccent`, and a synonyms table per
locale. Queries that return nothing are logged so synonyms can be added.

## Alternatives

- **Algolia, Meilisearch** — rejected: a separate service to run or pay for, for a few hundred
  products.

## Consequences

- No extra service; search quality depends on keeping the synonyms table up to date.
- Revisit if the catalog grows into thousands of products or relevance tuning is needed.
