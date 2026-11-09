# Roadmap — Sikora Beauty

Destination: a shopper finds professional care by zone, skin type, condition and need — alone,
through the questionnaire or through a cosmetologist — in Ukrainian or English, and buys it, paying
by card or cash on delivery, delivered by Nova Poshta; the owner and the cosmetologist run the
catalog, orders and requests in the admin without a developer.

No epic: each task merges into `master` through its own pull request, only on green CI, and deploys
at once — to the development host (Vercel Hobby + Neon; Production behind the site password the
owner and the cosmetologist share, Previews visible only to the developer) until
`production host` moves the store to Hetzner + Coolify; the store opens to shoppers in Phase 2.

Rules for every item:
- one item = one task = one pull request with a **Backend** and a **Frontend** section; a side the
  item does not touch is marked "—";
- UI is done only when it works at 360 px and on desktop, in both languages, and its components
  are in `/canvas`;
- UI strings go to `messages/uk.json` and `messages/en.json`; content text fields are localized;
- every input from outside passes a Zod schema; logic has Vitest tests;
- every merge to `master` is a deploy, so the pull request that changes what the site does also
  updates what the public reads about it: `README.md` (status, what is live, how to run it), the
  docs it touches and, when the summary changes, the repository description; a new check joins
  `ci.yml` in the item that brings the code it checks.

## Phase 0 — Foundation

Goal: an empty application lives on the development host, and the admin knows who may do what.
Done when: a push to `master` passes the CI gate and deploys to Vercel; `/` serves Ukrainian and
`/en` English; `/admin` opens; nobody but the developer can reach it; the owner and the
cosmetologist each have a role in the admin.

- [x] `walking-skeleton` — an empty application lives on the development host
  - Backend: Next.js + Payload 3 + Postgres replace the WebStorm template; docker compose locally;
    `ci.yml` split into one job per check, next to the existing `knowledge` and `audit`:
    `typecheck`, `lint`, `unit` (Vitest), `build`, `migrations` (Payload migrations apply to an
    empty Postgres), `i18n` (`uk` and `en` message keys match); `deploy.yml` (CI gate → Vercel,
    migrations on Neon before the build); Vercel Authentication on every URL; Payload
    localization `uk`/`en` and the admin in Ukrainian
  - Frontend: next-intl routing (`uk` at `/`, `en` at `/en`), `messages/` files, a placeholder
    page with a language switcher
- [x] `admin-roles` — the owner and the cosmetologist work in the admin with their own rights (after: walking skeleton — roles live on its users)
  - Backend: "owner" and "cosmetologist" roles on users, access rules per collection, Ukrainian
    labels; Vitest for the access rules
  - Frontend: —

## Phase 1 — Catalog, not public yet

Goal: products are filled in the admin and shown on the storefront with filters. Done when: the
owner sees on the development host, from a phone and a laptop, in both languages, the catalog of
one brand filled in by the cosmetologist in the admin, with filters by zone, skin type, condition,
need and brand. Both reach it with the site password, then their own admin accounts
(`deployment-access`, adr-20261029-site-password).

- [x] `design-direction` — the storefront has a face and a component set (after: walking skeleton — lives in the application)
  - Backend: —
  - Frontend: 2–3 prototypes for the owner to choose from (mobile + desktop), a text logo, colours,
    fonts; Tailwind v4 + shadcn/ui; `/canvas` with every component in every variant and state at
    both widths and in both languages (in production only for an admin, `noindex`)
- [x] `catalog-model` — the cosmetologist can create a product in the admin (after: walking skeleton — Payload collections)
  - Backend: brands, a tree of zones and categories, skin type, condition and need vocabularies, a
    product with every required field, availability statuses, new/bestseller/set/mini flags,
    related products, drafts, localized text fields, Ukrainian admin labels, the product Zod
    schema, vocabulary seed in both languages, on-demand revalidation
  - Frontend: —
- [x] `product-page` — the product page (after: catalog model — shows its fields; design direction — built on its components)
  - Backend: product query with related products, SEO data (meta, OG, JSON-LD Product, `hreflang`)
  - Frontend: every required field, gallery, delivery and payment block, related products; mobile
    + desktop; components in `/canvas`
- [x] `catalog-listing` — the catalog with filters (after: catalog model — filters by its vocabularies; design direction — built on its components)
  - Backend: queries by zone, category, skin type, condition, need and brand; facets with counts;
    pagination; Zod for URL parameters
  - Frontend: zone and category pages, filters as URL parameters (a sheet on mobile), landing pages
    for needs and skin types, sorting, empty facets hidden
- [x] `brands-and-collections` — brands and collections (after: catalog listing — the same lists with a fixed filter)
  - Backend: collection queries by flag
  - Frontend: brand pages, "New", "Bestsellers", "Sets", "Minis"
- [x] `catalog-import` — base data without typing it in (after: catalog model — writes into its collections)
  - Backend: import from the cosmetika.com.ua Store API (3 brands), everything as drafts; bulk
    price updates from a CSV of every product, Zod validation per row, applied whole or not at all,
    with an error report; a distributor's own price list, once there is one, decides its columns
    (adr-20261029-catalog-import)
  - Frontend: an import page in the admin
- [x] `content-drafts` — rich fields filled in and reviewed (after: catalog import — completes the imported products)
  - Backend: AI drafts of the rich fields from official brand material and of English
    translations; INCI only from a source + a "source" field; a wording checklist with no medical
    claims
  - Frontend: the admin shows that a draft comes from AI and waits for the cosmetologist's review

## Phase 2 — Public launch: cart and manager-confirmed orders

Goal: the store is open and takes orders a manager confirms. Done when: a visitor from Google, on a
phone, places an order with a Nova Poshta warehouse; the owner gets it in Telegram and sees it in
the admin; a consultation request reaches the cosmetologist; Google Ads counts the conversion.

- [x] `consultation-request` — a consultation request (after: design direction — built on its components)
  - Backend: a requests collection with a status (new / in progress / closed), a server action,
    Zod, Turnstile, Telegram
  - Frontend: the "get a consultation" button, a modal form, a "sent" state
- [x] `search` — search (after: catalog model — searches its products)
  - Backend: name, brand, active ingredient; word trigrams in memory + synonym groups ("доктор
    шпіллер") for both locales, not `pg_trgm` (adr-20261031-search-in-memory, the developer,
    2026-10-31); a log of zero-result queries
  - Frontend: a header field with suggestions, a results page, an empty state
- [x] `favorites` — favorites (after: product page — the button sits on the product card)
  - Backend: —
  - Frontend: favorites in localStorage, a heart on the card, a favorites page, a header counter
- [x] `cart-and-checkout` — guest checkout (after: product page — "add to cart")
  - Backend: `orders` with a price snapshot and statuses; a server action with a Zod schema that
    reprices on the server; Nova Poshta settlements and warehouses; a Telegram notification —
    moved to `telegram-notifications`, the task that connects Telegram to every entity at once
    (the developer, 2026-11-01)
  - Frontend: cart, a checkout form with Nova Poshta autocomplete, a choice of "cash on delivery /
    payment link from the manager", a thank-you page; an `e2e` CI job — Playwright at 360 px and
    desktop, in both locales: catalog → cart → order
- [x] `header-home-and-about` — navigation and the home page (after: brands and collections — links to every section)
  - Backend: home page blocks editable in the admin — the `pages` collection, not a global (the
    developer, 2026-10-30)
  - Frontend: header (logo, navigation, consultation, language switcher; search, favorites and the
    cart join it with their own items, the developer, 2026-10-30) with a mobile menu, main menu, home page with blocks, "About Sikora Beauty"; a link to the
    admin for a signed-in owner or cosmetologist, checked in the browser (`/api/users/me`) so the
    pages stay cached (the developer, 2026-10-30)
- [ ] production host — the store runs on its own server and domain (after: walking skeleton — moves the same application)
  - Order: last, after everything else and the client's feedback, with `backups and restore` and
    the opening of the store that depend on it (the developer, 2026-11-05)
  - Backend: the store's domain on Cloudflare (DNS; TLS full strict with an Origin CA
    certificate); a Hetzner VPS with Coolify, its panel and API only over HTTPS, a firewall that
    admits only Cloudflare to 80/443; the Docker image (a `docker` CI job) pushed to GHCR and
    deployed by `deploy.yml` through the Coolify API, waiting for the result; migrations on start
    (`prodMigrations`) behind a health check; Cloudflare Access in front of `/admin`; a rate limit
    at Cloudflare on sign-in and password reset (F17, F35 and F36 of customer-accounts); the first
    admin created from env, production refusing to start with an empty users collection; data
    moved from Neon; the site password set in Coolify, and `src/env.ts` requiring it there, not
    only when `VERCEL_ENV` is `production`
  - Frontend: —
- [ ] backups and restore — the database survives a crash (after: production host — backs up its database)
  - Backend: a daily backup to R2, a tested restore, a runbook, secrets in a password manager
  - Frontend: —
- [ ] launch readiness — the site is open (after: cart and checkout — the conversion measures a purchase; header, home and about — public navigation; production host — the store opens there; backups and restore — no launch without a tested restore)
  - Backend: sitemap with both locales, robots, uptime monitoring (Sentry itself came earlier, in
    sentry-monitoring; its free plan has one uptime monitor), a purchase event with value; open the store to shoppers on the production host: the site password removed
    (`src/proxy.ts`, `src/env.ts`); `SITE_URL` from the host's own address, as a letter's link
    falls back to localhost off Vercel; mail from the store's domain instead of its Gmail
  - Frontend: offer, privacy (it names Telegram, where orders and requests go:
    adr-20261102-orders-and-answers-in-telegram, and accounts and Gmail, which sends their letters:
    adr-20261103-customer-accounts), delivery and payment, returns pages in both
    languages (drafts exist ahead of the rest, task `shopper-pages`: returns inside payment and
    delivery and the offer as the terms of use, as on sisters.co.ua; a lawyer reads them and the
    seller's details are filled in before the store opens, and the 2 days for returning a sealed
    product, the developer's choice after Sisters', are checked against the 14 days law 3153-IX
    gives a distance sale once it is in force); consent banner
    (Consent Mode), GA4 and Ads; a `lighthouse` CI job with a mobile budget for the home, catalog
    and product pages
- [ ] fog: Merchant Center and Shopping — whether a new store passes moderation is unknown
- [x] `customer-accounts-findings` — the six findings customer-accounts left open are decided one
  by one, at the end of this phase by the developer's decision of 2026-11-03: F17, F21, F28, F33,
  F35, F36 (after: customer-accounts — they are its findings)

## Phase 3 — Care finder

Goal: a shopper who does not know what to buy gets a routine. Done when: a 5–7 question
questionnaire on a phone gives a routine (cleanse → … → SPF) from products in stock; the
cosmetologist edits the questions and rules in the admin.

- [x] `care-finder` — the "pick my care" questionnaire (after: catalog listing — the same vocabularies; consultation request — passes the answers on; content drafts — without content it recommends the same three products)
  - Backend: questions and rules in the admin; answers → skin type, condition, needs → a routine
    by step from products in stock; Vitest for the rules
  - Frontend: a step-by-step questionnaire on its own page, `/care-finder` (a page, not a modal:
    adr-20261101-care-finder-answers-to-terms), the routine as a result, "get a consultation" with
    the answers attached to the request

## Phase 4 — Online payment and waybills from the admin

Goal: a shopper pays ahead on the site — by a transfer to the store's account or by card — and a
manager creates a waybill in one click. Done when: the first real transfer and the first real mono
payment with a Checkbox receipt; a repeated or late webhook makes no duplicate; a waybill is created
from an order and the delivery status updates. The payment items were split in three on
2026-11-06, when mono was chosen and the seller's mono account was still to be opened
(adr-20261106-transfer-to-the-store-account).

- [x] `transfer-payment` — a transfer to the store's account (after: cart and checkout — pays for
  its orders)
  - Backend: the store's payment details in the admin, a payment status apart from the order's,
    forward only, marked by a manager; only when every item is in stock
  - Frontend: "transfer to the account" at checkout, the details with copy buttons on the thank-you
    page, found by the order's secret
- [x] `mono-payment` — card payment on the site (after: transfer payment — shares its payment
  status and thank-you page)
  - Backend: mono invoice, webhook with signature check and Zod, idempotency, forward-only
    statuses, a WAF exception; only when every item is in stock
  - Frontend: "pay by card", return from mono, "paid" and "failed" states
- [x] `mono-reconcile` — invoices without a webhook settle themselves (after: mono payment —
  reconciles its invoices)
  - Backend: a daily cron reads the invoices still open and moves them forward
- [ ] np waybill — waybills from the admin (after: cart and checkout — creates waybills for its orders)
  - Backend: waybill through the Nova Poshta API, cash on delivery, tracking by cron, refusals
    visible on the order
  - Frontend: a "create waybill" button and the delivery status in the admin

## Phase 5 — After launch

Goal: the store grows with real demand. Done when: each item below has become a concrete task or
been dropped on purpose.

- [x] `customer-accounts` — a shopper registers and signs in, and staff sign in the same way and get
  the admin; done ahead of the launch at the developer's request of 2026-11-02
  (adr-20261103-customer-accounts)
- [ ] fog: stock and price sync with the distributor — depends on the stock model
- [ ] fog: reviews, promo codes, loyalty, blog — by demand after launch
- [ ] fog: languages beyond Ukrainian and English — by traffic

## Waves

1. walking-skeleton
2. admin-roles; design-direction; catalog-model
3. product-page; catalog-listing; catalog-import; search; consultation-request
4. brands-and-collections; content-drafts; favorites; cart-and-checkout
5. header, home and about; care-finder
6. transfer-payment; np waybill
7. mono-payment
8. mono-reconcile
9. production host; backups and restore; launch readiness

<!--
Rules (jig-idea §8):
- An item is a finished slice that makes the product noticeably better, never a layer.
- A dependency without a one-line reason is not a dependency.
- A `task-id` appears when the item's task is filed; `[x]` is set when that task is closed.
- `fog:` items are not split or sized; they become real items once the fog lifts.
- No dates, no point estimates: order is the priority.
- `jig spec list` counts checkbox lines only: `[x]` done, a leading backticked task id
  followed by a dash (`—` or `-`) filed, a leading `fog:` fog. Keep waves as a numbered list.
- A wave entry names an item by its title (the text before its first ` — `) or its task id,
  entries separated by `;` — `jig spec plan` reports an entry that names no item or several.
-->
