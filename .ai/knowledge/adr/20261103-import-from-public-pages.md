---
id: adr-20261103-import-from-public-pages
type: adr
status: accepted
date: 2026-11-03
domains:
  - catalog
  - admin
paths:
  - src/lib/cosmetika.ts
  - src/collections/import-endpoints.ts
summary: Why the import lists products from wp/v2 and reads each price and gallery from the product's page, now that cosmetika's Store API answers 403.
reviewed_at: 2026-11-03
---
# The import reads cosmetika.com.ua's public addresses, as its Store API is closed

Refines adr-20261029-catalog-import: what that page does for the owner stays, and only where a
product's data comes from changes.

## Context

On 2026-11-03 the owner's import failed with «cosmetika.com.ua: відповіла 403». Store API's
`wc/store/v1/products`, which it was built on, answers WordPress's own `rest_forbidden` to everyone:
from Vercel and from the developer's machine, to `fetch` and to `curl`. `/wp-json/` and the
namespace's index still answer 200, so this is that route closed, not a firewall against us.
WordPress's own `wp/v2/product` and the product pages stay open, and `robots.txt` does not forbid
them. The developer confirmed that the store allows us its photos, texts and prices, and asked for
the products without that API. Source: task `import-public-pages`, the developer's decision of
2026-11-03.

## Decision

- **The list is `wp/v2/product`,** with `_embed=wp:term` for the brand and categories by name and
  `_fields` to keep it light: 3 MB per 100 products, not 5.3. It has the name, the description and the
  link. «Перевірити» reads only this, so it asks for no product's page.
- **A product's page holds the rest,** read in `importOne` once the product is known to be new, before
  any photo: the price from `offers[0].priceSpecification` in its JSON-LD and the gallery from
  `data-large_image`. A failed read fails that product with its reason, and a run again retries it.
- **Today's price is the entry without `priceType`.** A sale adds the list price, marked `ListPrice`,
  in any order. It is what Store API's `prices.price` gave.
- **Every address the server fetches stays on `https://www.cosmetika.com.ua`** (`cosmetikaUrl`), as the
  gallery now comes out of HTML. A page naming a photo elsewhere fails that product, and a redirect
  is refused, as `fetch` would otherwise follow it anywhere.
- **A paragraph labelled `<strong>СКЛАД</strong>:` is INCI too.** That is how 27 of Instytutum's 33
  products hold it. Dr. Spiller's plain «Склад: …» lists the actives, is not INCI, and stays in the
  purpose. As a run never changes an existing product, this had to hold before the first full run.
- **Our requests stay what they are.** No browser's `User-Agent`, no proxy: if the store closes these
  addresses too, the import stops with a message, and that is a question for the store.

## Alternatives

- **Asking the store to reopen the API or send an export** — no code, and the cleanest if it agrees,
  but the catalog waits on an answer; the developer chose not to wait.
- **Everything from the pages, by the sitemap** — no `wp/v2`, but «Перевірити» would read all 128 pages
  and every field would rest on the markup.
- **A distributor's or a brand's file** — no such file exists yet (adr-20261029-catalog-import).
- **Getting past the 403 by looking like a browser** — that would be working around the store's refusal.

## Consequences

- `offerOf` rests on the store's JSON-LD and gallery markup. When they change, a product fails with
  «ціну не прочитано» or a photo goes missing, and `cosmetika.ts` and its tests change with them.
- One product costs one more request: 128 pages over a whole import, five per request.
- cosmetika holds no INCI and no volume in the name for any of Dr. Spiller's 84 products (read
  2026-11-03), so those come from the brand or a distributor, or stay empty.
- The closed route may have been closed on purpose, and these addresses may follow. Nothing depends on
  the import once the drafts exist, so losing it costs only new products.
- A product on sale comes in at its sale price, as it did before: the owner checks prices before
  publishing.
- Undoing it: a revert returns to the closed API, so it brings the 403 back.
