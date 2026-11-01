---
id: adr-20261101-cart-and-checkout
type: adr
status: accepted
date: 2026-11-01
domains:
  - storefront
  - orders
  - delivery
paths:
  - src/lib/cart.ts
  - src/lib/browser-store.ts
  - src/lib/orders.ts
  - src/lib/novaposhta.ts
  - src/lib/actions/delivery.actions.ts
  - src/lib/actions/order.actions.ts
  - src/lib/actions/product-cards.actions.ts
  - src/collections/orders.ts
  - "src/app/*/(shop)/cart/**"
  - src/components/shared/header/cart-link.tsx
  - "tests/e2e/**"
  - playwright.config.ts
  - "src/app/*/(shop)/product/*/add-to-cart.tsx"
summary: The cart is [{id, qty}] in the shopper's localStorage; /cart shows it with today's cards and orders it through placeOrder, which reprices from the database and answers changed when the shown total differs; Nova Poshta search with an optional key and manual fields on failure; forward-only statuses in the admin; no Telegram yet
reviewed_at: 2026-11-01
---
# The cart lives in the shopper's browser, and `/cart` orders it through a server action that reprices it

Builds adr-20261028-own-orders-collection and refines adr-20261031-favorites-in-the-browser: its
`favoriteProducts` is now `productCards` (`product-cards.actions.ts`), which favorites and the cart
both call, and the part of its store they share is `browserStore` (`src/lib/browser-store.ts`).

## Context

Guest checkout, launch step 1 (adr-20261028-two-step-launch): a manager confirms every order by
phone, then the shopper pays on delivery or by a link the manager sends. There are no accounts;
product pages are cached until a save; the header shows the cart's count on every page. The Nova
Poshta API key will be the developer's own and does not exist yet. Telegram is connected to every
entity in one later task (the developer, 2026-11-01). Source: task `cart-and-checkout`, the
developer's decisions at its gate of 2026-11-01.

## Decision

- **The cart.** `localStorage['cart']` holds `[{id, qty}]`, the newest line first: at most
  `CART_LINES` (50) lines and `CART_QUANTITY_MAX` (10) of one product; anything else reads as the
  nearest allowed cart (`parseCart`). No prices, names or personal data. `src/lib/cart.ts` sits on
  `browserStore`, as favorites do: the server and the first render see an empty cart, another
  tab's change arrives with the `storage` event, blocked storage keeps the cart in memory.
- **One page.** `/cart` (`force-dynamic`, `noindex`) shows the lines with today's cards from
  `productCards`, takes out what the server no longer has and says how many, keeps an
  out-of-stock line marked and not ordered, and puts the checkout form under the total. «Loading»
  and «failed» are for the first answer only: a later refetch keeps what was typed.
- **The shown total is a check.** The form sends the lines it orders and the total it showed.
  `placeOrder` (`order.actions.ts`) checks `orderRequest` and Turnstile, reads the products from
  the database (published only, in `uk`), and `priceOrder` (`src/lib/orders.ts`) builds the
  snapshot and the total from them. A missing or out-of-stock product, or a total other than the
  shown one, answers `changed`; the page re-reads the cards and keeps the form. The browser's
  total is never the price.
- **Nova Poshta.** `findSettlements` and `findWarehouses` (`delivery.actions.ts`) call
  `src/lib/novaposhta.ts` (`server-only`, a 5 s timeout, every answer through Zod), cache a
  successful answer for 12 hours (`unstable_cache`) and answer any failure `unavailable`; a Latin
  query is answered `latin` with no call. The key is sent when `NOVA_POSHTA_API_KEY` is set,
  otherwise empty: Nova Poshta answers the address search without one today, which is not a
  promise. On `unavailable` the form shows plain «Місто» and «Відділення або поштомат» fields
  until the page reloads; the order then has no refs, and the manager checks the address on the
  call. `NOVA_POSHTA_API_URL` points the module elsewhere — at the e2e stub.
- **The order's number is its id.** `/cart/thanks?order=N` shows the number from the URL and a
  static text, and reads nothing from the database.
- **The admin.** `orders`, group «Продажі»: no role creates one through the API, and what the
  shopper sent and the snapshot no role updates; an admin role edits the status and the manager's
  note, the owner deletes. The status only moves forward (`canMoveStatus` in a `beforeChange`
  hook): `new → confirmed → shipped → completed`, `cancelled` from anything but `completed`; a
  mistaken step is told in the note.
- **No Telegram yet.** `placeOrder` tells nobody; the manager sees new orders in the admin until
  the Telegram task.
- **The header on a phone.** Below `sm` its buttons are 32 px (`max-sm:*:size-8`), so the
  consultation, search, favorites and the cart keep one line at 360 px.
- **e2e.** Playwright (`playwright.config.ts`, `tests/e2e/`) goes catalog → cart → order at 360
  and 1280 px in both locales, against a build, a seeded database and a Nova Poshta stub, and
  reads the order back with `pg`; the CI job `e2e` runs it.

## Alternatives

- **A cookie the server reads, or a cart in the database under an anonymous token** — the header's
  count would make every page dynamic; a token syncs nothing the shopper has and leaves dead carts
  in a table.
- **Names and prices kept in localStorage** — they go stale, and the server reprices anyway.
- **`/cart` and `/checkout`, or a cart sheet and `/checkout`** — another route, the lines shown
  twice; a sheet is one more client component in every page's header, and at 360 px a page anyway.
- **Ordering at the new price silently, or at the browser's** — the order would not be what the
  shopper saw; the browser's price is forbidden (RULES.md).
- **Nova Poshta's directory synced into the database nightly** (~55,000 warehouses) — a cron, a
  migration and ~150 MB a night; worth it once waybills or English place names need it.
- **Nova Poshta's widget** (an iframe) — needs a widget key there is none of, sits behind a
  Cloudflare challenge the shopper may fail, and looks foreign in the form.
- **Plain text fields until there is a key, or no checkout without one** — worse for the shopper
  while Nova Poshta answers; a sale blocked by an outside service.
- **The real Nova Poshta API in CI, Next's `experimental.testProxy`, or e2e on the manual fields
  only** — flaky and rate-limited; an experimental option for tests; the main path untested.
- **A random order code** — hides the volume, but needs a field, a unique index and a retry on a
  collision.
- **A thank-you page that reads the order** — anyone could walk the numbers and read another
  shopper's data. By a secret token instead — deferred to `launch readiness`, if its purchase
  event needs the order.
- **A second copy of the browser store** — two places with the same traps.
- **A status the owner may move back** — breaks the invariant; a later monobank webhook could not
  tell a step back from a mistake.
- **The manager editing the contacts and the address** — the snapshot would stop being what the
  shopper sent, with no history of the change.
- **Favorites, or the consultation, moved into the menu sheet on a phone** — the favorites count
  would leave the phone; the developer kept the consultation in the header (task
  `consultation-request`).

## Consequences

- The cart stays in one browser; its count and lines fill in a moment after a page loads.
- A price or availability change between the cart and the order costs the shopper a second
  press, never a sum they did not see.
- If Nova Poshta stops answering without a key, the form falls back to the manual fields by
  itself, and the key set in Vercel brings the search back without a code change.
- The manager watches `/admin` for new orders until the Telegram task.
- Undoing it: a revert, and the migration's `down` drops `orders` with its rows. Until
  `launch readiness` the site is behind the password and the table holds test orders only; after
  the launch, export first. Browsers keep a `cart` key nothing reads.
