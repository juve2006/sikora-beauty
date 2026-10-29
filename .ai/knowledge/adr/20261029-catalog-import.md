---
id: adr-20261029-catalog-import
type: adr
status: accepted
date: 2026-10-29
domains:
  - catalog
  - admin
paths:
  - src/catalog/cosmetika.ts
  - src/catalog/prices.ts
  - src/catalog/importEndpoints.ts
  - src/catalog/ImportView.tsx
  - src/catalog/CosmetikaImport.tsx
  - src/catalog/PricesCsv.tsx
summary: The owner's admin page imports cosmetika.com.ua products as drafts, a few per request, and applies a CSV of prices whole or not at all
reviewed_at: 2026-10-29
---
# The owner imports products from cosmetika.com.ua and prices from a CSV on one admin page, a few products per request

## Context

Typing in a catalog of hundreds of products by hand takes weeks, and prices move with the
distributor's (spec `sikora-beauty`, stress test 7). cosmetika.com.ua sells three of our brands —
Dr. Spiller, Instytutum, Braderm, 128 products — through a public WooCommerce Store API, and the
developer may use its photos, texts and prices. No distributor price list exists yet; a price is
the retail price in hryvnias. The development host is Vercel Hobby: a function has a time limit, and
nothing runs a background job. Source: task `catalog-import`, the developer's decisions of
2026-10-29 (the import in the admin, not a script).

## Decision

- One admin page, «Інструменти → Імпорт» (`/admin/import`), for the owner only: both of its tools
  write prices, which are the owner's (adr-20261029-admin-roles). A visitor who may not open the
  admin is sent to the login, the cosmetologist reads «Лише для власника»; its endpoints on
  `products` answer `403` to anyone but the owner, and every write goes through access as the owner.
- **Products from cosmetika.com.ua.** «Перевірити» reads the Store API and shows which products of
  our brands are new; «Імпортувати нові» sends their ids five at a time, and the server reads each
  product from cosmetika itself — the browser never sends product data. A product is created as a
  draft, whole or not at all: photos into `media`, name, slug, brand, categories by a fixed table,
  volume from the name, cosmetika's price; «Спосіб застосування» into how to use, «Склад (INCI)»
  into INCI with the cosmetika page as its source, the rest of the description into purpose.
  Availability stays empty, so nothing is published before the owner sets it. A product whose slug
  exists is skipped: a run never changes what is there, and a run again finishes one that was
  interrupted. A photo's file name ends in a random part: every environment shares one Blob store,
  where a server upload overwrites a file of the same name (adr-20261028-media-on-vercel-blob).
- **Prices in CSV.** The owner downloads every product's price (`slug;name;brand;volume;price`,
  hryvnias, UTF-8 with a BOM for Excel), edits the `price` column and uploads the file. The page
  shows every change «було → стане»; a file with any bad row is applied not at all, and a good one
  in one transaction, refreshing the storefront once, after the commit. A product's latest version
  decides where the price goes: a published one is published with it, a draft keeps it in the
  draft — together with whatever else that draft holds unpublished.

## Alternatives

- **A script the developer runs, like `seed:catalog`** — the least code; rejected by the developer:
  the owner runs the import himself, in the admin.
- **The whole import in one request** — about 300 photos are minutes of work, past a function's time.
- **Payload's jobs queue** — needs a runner; a Vercel Hobby cron runs once a day.
- **`@payloadcms/plugin-import-export` for prices** — first-party and respects field access, but two
  upload collections with their own storage, access and migration, the jobs queue again, prices
  exported in kopiyky, and a generic UI where a file with names in it overwrites texts.
- **An `sku` field as the key** — only Dr. Spiller has one on cosmetika, and no price list says
  which key it uses; the slug is unique already.
- **Applying the good rows of a file with errors** — a half-applied price list is harder to see
  than a refused one.

## Consequences

- The import runs while the page is open; leaving it stops the import, and nothing is half-made.
- Renaming a product keeps its slug, so a rerun does not duplicate it; a product renamed on
  cosmetika comes back as a new draft.
- cosmetika's markup decides the texts: a heading is an `<h1>`–`<h6>` or a paragraph of bold text
  alone. When their markup or categories change, `cosmetika.ts` and its tests change with them.
- INCI copied from a shop's page still needs the cosmetologist's check against the packaging.
- A distributor's own price list, when one exists, decides whether products get an `sku` and
  whether the CSV takes its columns.
- Glymed+, Innoaesthetics, Me line and Dermafirm are not on cosmetika (spec open question 3).
