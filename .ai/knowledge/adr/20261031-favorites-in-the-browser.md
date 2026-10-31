---
id: adr-20261031-favorites-in-the-browser
type: adr
status: accepted
date: 2026-10-31
domains:
  - storefront
  - catalog
paths:
  - src/lib/favorites.ts
  - src/lib/actions/favorites.actions.ts
  - "src/app/*/(shop)/favorites/**"
  - src/components/shared/product/favorite-button.tsx
  - src/components/shared/header/favorites-link.tsx
summary: Favorites are product ids, newest first, in the shopper's localStorage behind a useSyncExternalStore store; /favorites gets their cards from a server action and drops what is no longer published; the cart follows the pattern
reviewed_at: 2026-10-31
---
# Favorites are product ids in the shopper's localStorage, and the server sends only their cards

Refines adr-20261030-header-menu-and-pages-from-payload and adr-20261031-search-in-memory:
`favoriteProducts` is a third read of Payload the browser calls, through a server action, as the
search ADR's `suggestProducts` is.

## Context

The spec has no accounts: a shopper keeps favorites without signing in, and stack.md put
favorites and the cart in localStorage. The header shows how many there are on every page, and
product pages are cached until a save revalidates them. A product a shopper kept may later change
its price, run out, be taken off the store or be deleted. Source: task `favorites`, the developer's
decisions at its gate of 2026-10-31.

## Decision

- **What is kept.** `localStorage['favorites']` is a JSON array of product ids, the newest first, at
  most `FAVORITES_LIMIT` (100): a new one past the limit drops the oldest. Ids, not slugs — the
  owner may change a slug. One list for `/` and `/en`. Anything that is not a list of positive
  whole numbers reads as no favorites.
- **The store.** `src/lib/favorites.ts` holds it behind `useSyncExternalStore`: `useFavorites()`,
  `toggleFavorite(id)`, `keepFavorites(asked, found)`. The server and the first render see an empty
  list, so no page reads a cookie and every page keeps its cache; the browser's list comes on
  hydration. Another tab's change arrives with the `storage` event. Blocked storage (a private
  window) keeps the list in memory until the page reloads.
- **The cards.** `/favorites` (`force-dynamic`, `noindex`) asks the server action
  `favoriteProducts(ids, locale)` (`favorites.actions.ts`, `'use server'`) for them. It validates
  with `favoritesRequest` (at most 100 positive whole ids, a locale), reads through
  `getListingProducts` — published only, today's price and availability — and answers in the order
  the browser kept. A request it cannot read fails rather than answer with none.
- **A product the server does not return** — deleted, or taken off the store — leaves the
  favorites, so the header's count matches the page. A failed request removes nothing: the page
  offers to try again.
- The cart takes the same pattern under its own key.

## Alternatives

- **A snapshot of each card in localStorage** (name, price, photo) — a page with no request, but a
  price and availability go stale, a deleted product stays, and the cart needs today's prices from
  the server anyway.
- **A cookie the server reads** — `/favorites` without a loading state, but the header's count
  would make every page dynamic and product pages would lose their cache; the cookie rides every
  request.
- **Favorites in an account** — the spec has no accounts.
- **Keeping a product the server did not return, greyed out** — the count would not match the
  page, and a deleted product never comes back.

## Consequences

- Hearts and the header's count fill in a moment after the page loads.
- Favorites stay in one browser: a phone and a laptop each keep their own.
- A product taken off the store and published again is not back in anyone's favorites.
- Undoing it: a revert. Shoppers' browsers keep a `favorites` array nothing reads; no database,
  money or other system is touched.
