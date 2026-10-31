---
id: adr-20261031-search-in-memory
type: adr
status: accepted
date: 2026-10-31
domains:
  - search
  - catalog
paths:
  - src/lib/search.ts
  - src/lib/actions/search.actions.ts
  - src/lib/actions/suggest.actions.ts
  - src/collections/search-synonyms.ts
  - src/collections/search-misses.ts
  - "src/components/shared/search/**"
  - "src/app/*/(shop)/search/**"
summary: Search matches every published product in memory by word trigrams, with synonym groups and a capped log of misses; supersedes pg_trgm
reviewed_at: 2026-10-31
---
# Search matches every published product in memory by word trigrams, with synonym groups and a capped log of misses

Supersedes adr-20261028-postgres-search, which planned `pg_trgm` and `unaccent` in Postgres.
Refines adr-20261030-code-layout-nextjs-store: a read the browser calls is a `'use server'` file
of its own. Refines adr-20261030-header-menu-and-pages-from-payload: `AdminLink` is no longer the
storefront's one read of Payload outside a server component — `suggestProducts` is the other.

## Context

A few hundred products. Shoppers type a name, a brand or an active ingredient, in Ukrainian or
English, in Cyrillic or Latin («шпіллер», «spiller»), with typos, apostrophes or none, and in
other spellings («доктор шпіллер»). The plan was `pg_trgm` in Postgres. Discovery found that a
database whose `LC_CTYPE` is `C` gives `pg_trgm` no trigrams for Cyrillic
(`show_trgm('Шпіллер')` is empty): Ukrainian search would come back empty without an error, and
every new database — Neon, then Hetzner, then a restore — would have to be checked for it.
Source: task `search`, the developer's decisions at its gate of 2026-10-31.

## Decision

- **Matching in memory.** Each search reads every published product through the Local API
  (`overrideAccess: false`, `locale: 'all'`): names in both languages, the brand, the actives'
  names. `findProducts` in `src/lib/search.ts` is pure: the query and each text are lower-cased,
  stripped of apostrophes and Latin diacritics, and transliterated as `slugify` does, with ы э ё ъ
  first mapped to Ukrainian letters. Words are compared by trigrams as `pg_trgm` does. A product
  word that begins with the query word scores 0.9, the same word scores 1. Every query word must
  reach 0.4, so «крем шпіллер» means a cream *and* Dr.Spiller. One-letter words are skipped.
  Results are ordered by mean score, then by name in the page's language.
- **Synonyms.** `search-synonyms` holds groups of spellings, one per line in a textarea, at least
  two. A group has no language. A query that contains one spelling is also tried with each other
  spelling, and the best result wins. Both admin roles create, edit and delete groups; anyone
  reads them, as search reads them with `overrideAccess: false`. The seed
  adds groups only to an empty collection, for the brands transliteration cannot reach and for a
  few actives.
- **Misses.** A query that finds nothing on the results page is written to `search-misses` in
  `after()`, once the page is sent. It is stored lower-cased with spaces collapsed, unique, with
  a count. Suggestions never write. Create and update are `nobody`: only `recordSearchMiss`
  writes, through the Local API. Both roles read and delete. The log holds at most
  `SEARCH_MISSES` (1000) different queries; past that a new query is dropped, and known ones keep
  counting.
- **Where it shows.** The header's `SearchDialog` shows up to `SUGGESTIONS` (6) products through
  the server action `suggestProducts`. Enter, or «Усі результати», opens `/search?q=` with up to
  `SEARCH_LIMIT` (48) cards and no pages. That page is `noindex` and `force-dynamic`, and its
  `next/form` works without JavaScript.
- **A read the browser calls** is a `'use server'` function in a file of its own
  (`suggest.actions.ts`) over the `server-only` read (`searchProducts`). `search.actions.ts`
  stays `server-only`: `recordSearchMiss` writes and `searchProducts` takes any limit, and every
  export of a `'use server'` file is a POST endpoint anyone can call. `suggestProducts` validates
  its input with Zod and asks for `SUGGESTIONS` products, never more.

## Alternatives

- **`pg_trgm` + `unaccent` in Postgres (the old decision)** — faster with thousands of products,
  but blind to Cyrillic under `LC_CTYPE C`. Raw SQL over Payload's tables bypasses `access.read`,
  so «published only» would have to be repeated by hand. Latin ↔ Cyrillic needs transliteration
  in JavaScript anyway. Tests would need Postgres in CI.
- **Algolia, Meilisearch** — a service to run or pay for, for a few hundred products.
- **Synonyms as `text` with `hasMany`** (the first design) — a table per spelling and a chip
  input. One textarea is easier to paste into, and one column holds it.
- **Writing misses from the suggestions** — every keystroke would be a row.
- **No cap on the log** — once the site password is gone, a script could fill the table with
  distinct queries and bury the real ones.
- **A Route Handler for suggestions** — a fetch and JSON built by hand. The server action's cost
  is accepted: the client sends actions one at a time, and they are never cached — the cost for
  which adr-20261030-code-layout-nextjs-store keeps the server components' reads plain functions.

## Consequences

- Each search reads all published products (about 600 rows, without photos), the same ceiling
  as `listing.ts`, marked `ponytail:`. With 600 products under `next start`, `/search` answered
  in 64–85 ms, as fast as `/catalog/face`. With thousands of products, move to `pg_trgm` with
  indexes in a database whose locale knows Cyrillic.
- `slugify` drives search: changing its transliteration changes what search finds.
- Search quality depends on the owner adding synonyms from «Пошук без результатів».
- Counts in the log are approximate: two simultaneous first misses of one query can lose one.
- Undoing it: a revert, and the migration's `down` drops both tables with their synonyms and log.
