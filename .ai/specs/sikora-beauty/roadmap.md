# Roadmap — Sikora Beauty

Destination: a shopper finds professional care by zone, skin type, condition and need — alone,
through the questionnaire or through a cosmetologist — in Ukrainian or English, and buys it, paying
by card or cash on delivery, delivered by Nova Poshta; the owner and the cosmetologist run the
catalog, orders and requests in the admin without a developer.

No epic: each task merges into `master` through its own pull request, only on green CI, and deploys
at once; the site stays behind a password until Phase 2.

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

Goal: an empty application lives on the server and survives a crash. Done when: a push to `master`
passes the CI gate and deploys to Hetzner/Coolify; `/` serves Ukrainian and `/en` English;
`/admin` opens; a backup from R2 is restored to an empty database by the written steps.

- [ ] walking skeleton — an empty application lives on the server
  - Backend: Next.js + Payload 3 + Postgres replace the WebStorm template; docker compose locally;
    `ci.yml` split into one job per check, next to the existing `knowledge` and `audit`:
    `typecheck`, `lint`, `unit` (Vitest), `build`, `docker` (the production image builds),
    `migrations` (Payload migrations apply to an empty Postgres), `i18n` (`uk` and `en` message
    keys match); `deploy.yml` (CI gate → image → GHCR → Coolify); Cloudflare DNS and TLS; the site
    behind a password; Payload localization `uk`/`en` and the admin in Ukrainian
  - Frontend: next-intl routing (`uk` at `/`, `en` at `/en`), `messages/` files, a placeholder
    page with a language switcher
- [ ] backups and restore — the database survives a crash (after: walking skeleton — backs up its database)
  - Backend: a daily backup to R2, a tested restore, a runbook, secrets in a password manager
  - Frontend: —
- [ ] admin access — the admin is protected (after: walking skeleton — protects its admin)
  - Backend: Cloudflare Access in front of `/admin`, "owner" and "cosmetologist" roles, Renovate
  - Frontend: —

## Phase 1 — Catalog behind a password

Goal: products are filled in the admin and shown on the storefront with filters. Done when: the
owner sees on the server, from a phone and a laptop, in both languages, the catalog of one brand
filled in by the cosmetologist in the admin, with filters by zone, skin type, condition, need and
brand.

- [ ] design direction — the storefront has a face and a component set (after: walking skeleton — lives in the application)
  - Backend: —
  - Frontend: 2–3 prototypes for the owner to choose from (mobile + desktop), a text logo, colours,
    fonts; Tailwind v4 + shadcn/ui; `/canvas` with every component in every variant and state at
    both widths and in both languages (in production only for an admin, `noindex`)
- [ ] catalog model — the cosmetologist can create a product in the admin (after: walking skeleton — Payload collections)
  - Backend: brands, a tree of zones and categories, skin type, condition and need vocabularies, a
    product with every required field, availability statuses, new/bestseller/set/mini flags,
    related products, drafts, localized text fields, Ukrainian admin labels, the product Zod
    schema, vocabulary seed in both languages, on-demand revalidation
  - Frontend: —
- [ ] product page — the product page (after: catalog model — shows its fields; design direction — built on its components)
  - Backend: product query with related products, SEO data (meta, OG, JSON-LD Product, `hreflang`)
  - Frontend: every required field, gallery, delivery and payment block, related products; mobile
    + desktop; components in `/canvas`
- [ ] catalog listing — the catalog with filters (after: catalog model — filters by its vocabularies; design direction — built on its components)
  - Backend: queries by zone, category, skin type, condition, need and brand; facets with counts;
    pagination; Zod for URL parameters
  - Frontend: zone and category pages, filters as URL parameters (a sheet on mobile), landing pages
    for needs and skin types, sorting, empty facets hidden
- [ ] brands and collections — brands and collections (after: catalog listing — the same lists with a fixed filter)
  - Backend: collection queries by flag
  - Frontend: brand pages, "New", "Bestsellers", "Sets", "Minis"
- [ ] catalog import — base data without typing it in (after: catalog model — writes into its collections)
  - Backend: import from the cosmetika.com.ua Store API (3 brands) and from a distributor's
    CSV/XLSX price list, also for bulk price updates; Zod validation per row; everything lands as
    drafts; an error report
  - Frontend: an import page in the admin
- [ ] content drafts — rich fields filled in and reviewed (after: catalog import — completes the imported products)
  - Backend: AI drafts of the rich fields from official brand material and of English
    translations; INCI only from a source + a "source" field; a wording checklist with no medical
    claims
  - Frontend: the admin shows that a draft comes from AI and waits for the cosmetologist's review

## Phase 2 — Public launch: cart and manager-confirmed orders

Goal: the store is open and takes orders a manager confirms. Done when: a visitor from Google, on a
phone, places an order with a Nova Poshta warehouse; the owner gets it in Telegram and sees it in
the admin; a consultation request reaches the cosmetologist; Google Ads counts the conversion.

- [ ] consultation request — a consultation request (after: design direction — built on its components)
  - Backend: a requests collection with a status (new / in progress / closed), a server action,
    Zod, Turnstile, Telegram
  - Frontend: the "get a consultation" button, a modal form, a "sent" state
- [ ] search — search (after: catalog model — searches its products)
  - Backend: name, brand, active ingredient; pg_trgm + `unaccent` + synonyms ("доктор шпіллер"),
    per locale; a log of zero-result queries
  - Frontend: a header field with suggestions, a results page, an empty state
- [ ] favorites — favorites (after: product page — the button sits on the product card)
  - Backend: —
  - Frontend: favorites in localStorage, a heart on the card, a favorites page, a header counter
- [ ] cart and checkout — guest checkout (after: product page — "add to cart")
  - Backend: `orders` with a price snapshot and statuses; a server action with a Zod schema that
    reprices on the server; Nova Poshta settlements and warehouses; a Telegram notification
  - Frontend: cart, a checkout form with Nova Poshta autocomplete, a choice of "cash on delivery /
    payment link from the manager", a thank-you page; an `e2e` CI job — Playwright at 360 px and
    desktop, in both locales: catalog → cart → order
- [ ] header, home and about — navigation and the home page (after: brands and collections — links to every section)
  - Backend: home page blocks editable in the admin (a global)
  - Frontend: header (logo, search, favorites, cart, navigation, consultation, language switcher)
    with a mobile menu, main menu, home page with blocks, "About Sikora Beauty"
- [ ] launch readiness — the site is open (after: cart and checkout — the conversion measures a purchase; header, home and about — public navigation)
  - Backend: sitemap with both locales, robots, Sentry, uptime monitoring, a purchase event with
    value; remove the password
  - Frontend: offer, privacy, delivery and payment, returns pages in both languages; consent banner
    (Consent Mode), GA4 and Ads; a `lighthouse` CI job with a mobile budget for the home, catalog
    and product pages
- [ ] fog: Merchant Center and Shopping — whether a new store passes moderation is unknown

## Phase 3 — Care finder

Goal: a shopper who does not know what to buy gets a routine. Done when: a 5–7 question
questionnaire on a phone gives a routine (cleanse → … → SPF) from products in stock; the
cosmetologist edits the questions and rules in the admin.

- [ ] care finder — the "pick my care" questionnaire (after: catalog listing — the same vocabularies; consultation request — passes the answers on; content drafts — without content it recommends the same three products)
  - Backend: questions and rules in the admin; answers → skin type, condition, needs → a routine
    by step from products in stock; Vitest for the rules
  - Frontend: a step-by-step modal questionnaire, the routine as a result, "get a consultation"
    with the answers attached to the request

## Phase 4 — Online payment and waybills from the admin

Goal: a shopper pays by card on the site, a manager creates a waybill in one click. Done when: the
first real mono payment with a Checkbox receipt; a repeated or late webhook makes no duplicate; a
waybill is created from an order and the delivery status updates.

- [ ] mono payment — card payment on the site (after: cart and checkout — pays for its orders)
  - Backend: mono invoice, webhook with signature check and Zod, idempotency, forward-only
    statuses, reconciliation by cron, a WAF exception; only when every item is in stock
  - Frontend: "pay by card", return from mono, "paid" and "failed" states
- [ ] np waybill — waybills from the admin (after: cart and checkout — creates waybills for its orders)
  - Backend: waybill through the Nova Poshta API, cash on delivery, tracking by cron, refusals
    visible on the order
  - Frontend: a "create waybill" button and the delivery status in the admin

## Phase 5 — After launch

Goal: the store grows with real demand. Done when: each item below has become a concrete task or
been dropped on purpose.

- [ ] fog: customer accounts — once there are repeat buyers
- [ ] fog: stock and price sync with the distributor — depends on the stock model
- [ ] fog: reviews, promo codes, loyalty, blog — by demand after launch
- [ ] fog: languages beyond Ukrainian and English — by traffic

## Waves

1. walking skeleton
2. backups and restore; admin access; design direction; catalog model
3. product page; catalog listing; catalog import; search; consultation request
4. brands and collections; content drafts; favorites; cart and checkout
5. header, home and about; care finder
6. launch readiness; mono payment; np waybill

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
