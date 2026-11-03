# Architecture

Sikora Beauty is an online store for professional skincare from seven brands (Dr.Spiller, Glymed+,
Innoaesthetics, Me line, Dermafirm, Braderm, Institutum). It serves shoppers who do not know which
professional product suits them: they find care by zone, skin type, skin condition and skin
concern — alone, through the care finder or through the cosmetologist — in Ukrainian or English,
and buy it with card payment or cash on delivery, delivered by Nova Poshta. The owner and the
cosmetologist, who are not technical, run catalog, orders and consultation requests in the admin.
Source: spec `sikora-beauty`.

## Built

The walking skeleton: one Next.js 16 application with Payload 3 inside it, on Postgres
(adr-20261028-next-payload-single-app).

- **Storefront** — `src/app/[locale]/` is its own root layout, beside `(payload)` and not
  above it: Payload's admin breaks under a `[locale]` segment (payload#10675). `src/proxy.ts`
  first asks for the site password until the launch (adr-20261029-site-password), then
  (next-intl) routes `uk` at `/` and `en` at `/en` and skips `/admin`, `/api`, `_next` and
  files. It never picks a language from the browser or a cookie: with detection on, `/`
  redirected an English browser to `/en` and the switcher could not get back; `src/i18n/request.ts` takes the locale from `next/root-params`; strings in
  `messages/*.json`, kept to the same keys by `scripts/check-messages.mjs` in CI.
  - Its look is Tailwind CSS v4 and shadcn/ui on theme tokens in `src/app/[locale]/globals.css`,
    which only this layout imports, so the admin never gets the storefront's styles; a light and a
    dark theme, set before the first paint by an inline script in the layout
    (adr-20261029-storefront-look). A link to the other language is a plain `<a>`, never
    next-intl's `Link` with `locale`: each language is its own root layout, and a client
    navigation into it renders `<html>` without the class the script set. Components take
    everything from the tokens (convention-storefront-components): shadcn's in
    `src/components/ui/`; the header's in `src/components/shared/header/` — `SiteHeader`
    (`index.tsx`), `Logo`, `LanguageSwitcher`, `ThemeToggle`, `MainMenu`, `MobileMenu`, `AdminLink`,
    `FavoritesLink`, `CartLink`, `AccountLink`; a page's blocks in `src/components/shared/blocks/`; the product's in
    `src/components/shared/product/` — price, availability, the card and its no-photo placeholder,
    `FavoriteButton`;
    the catalog's in `src/components/shared/catalog/` — the filters, the sort, the list with its
    pages; the search's in `src/components/shared/search/` — `SearchDialog` and the suggestions it
    shows; the account's in `src/components/shared/account/` — `AccountDialog`, the forms of sign-in
    and registration and their fields. A component only one page shows lives in that page's route folder: the gallery, the cart
    button and delivery and payment in the product page's, the category chips in
    `/catalog/<slug>`'s, the cart's lines, the checkout form and the delivery fields in `/cart`'s,
    the questions and the routine in `/care-finder`'s.
  - The header: every page under `(shop)/` gets it from `(shop)/layout.tsx`. `SiteHeader` reads the
    menu with `getMenu` (`category.actions.ts`) — the zones with their categories and the skin
    concerns, in the admin's order — beside fixed links to the brands, the collections and the
    about page, and with `isFinderOn` (`finder.actions.ts`) whether to link the care finder (Care
    finder, below): the catalog's menu does not know the finder. Below `lg` the menu is `MobileMenu`, a sheet from the left; below `sm` the language
    and the theme move into that sheet and the buttons left in the header are 32 px, so it keeps
    one line at 360 px. «Обране» is `FavoritesLink` (Favorites, below), «Кошик» `CartLink` (Cart
    and orders, below), the account `AccountLink` (Accounts, below). «Пошук» opens `SearchDialog` (Search, below). «Адмінка» is
    `AdminLink`, which asks `/api/users/me` from the browser and checks the answer with
    `adminSession`: the storefront's one call from the browser to Payload's own API, so no page
    reads the cookie and product pages stay cached. The layout reads Payload, so a page the build
    would prerender is `force-dynamic` (RULES.md, adr-20261030-header-menu-and-pages-from-payload).
  - Footer: `SiteFooter` (`src/components/shared/footer/`, from the same layout) takes the header's
    `getMenu` and `isFinderOn`, and `getContacts` (`contacts.actions.ts`) reads the global `contacts`,
    «Сторінки → Контакти», which both roles keep. What is left empty is not shown, and with nothing
    filled in the column goes, so the store never needs a contact it does not have. Links to the
    privacy, delivery and returns pages join once those pages exist. The block is in the primary
    colour and renames `--foreground`, `--muted-foreground` and `--ring` for what is inside, so `Logo`
    and a focus ring read on it without a variant of their own.
  - The way back up: `BackToTop` (`src/components/shared/back-to-top/`, from the same layout) and the
    admin's own (`src/components/admin/back-to-top.tsx`, a Payload provider, as that is what reaches
    every admin page) share `src/lib/back-to-top.ts`, as they share no styles.
  - The admin's look is Payload's UI with its buttons in the store's colour and its «are you sure»
    dialogs centred (`src/app/(payload)/custom.scss`). Payload's bulk publish dialog takes no count
    and its status row takes no item, so `PublishCount` and `PublishedAt` (`src/components/admin/`)
    add theirs from the slots beside them, by Payload's class names: a Payload upgrade can move
    those, and `tests/e2e/admin-look.spec.ts` is what notices. The publication date is the latest
    published version's, not a field. `useIntersect` keeps a batch's first entry, so a relationship
    cell can act on where the page sat in the frame the nav stands open; `custom.scss` keeps the
    page's width in that frame, or a list with text over it loses its brands on a phone.
  - Pages: the collection `pages`, admin group «Сторінки» — a title, a slug and blocks: `hero`,
    `products`, `tiles`, `consultation`, `text` (`src/collections/page-blocks.ts`). The slug `home`
    is `/` (`(shop)/page.tsx`), any other `/<slug>` (`(shop)/[slug]/`); `/home` is 404, and a slug
    that names a section of the store is refused (`RESERVED_SLUGS`). `getPage`
    (`src/lib/actions/page.actions.ts`) reads one; `PageBlocks` renders the blocks in the admin's
    order, under the page's own heading unless a banner opens them, and the home page with no page
    shows the store's title and description. A block that reads the store's data (`Tiles`,
    `ProductsBlock`) hands it to a component that only shows it (`TileGrid`, `ProductGrid`),
    which `/canvas` feeds with samples. Pages have no drafts: a save is live at once (adr-20261030-header-menu-and-pages-from-payload).
  - The product page, `/product/<slug>` (`src/app/[locale]/(shop)/product/[slug]/`): the fields the
    spec names, the gallery, delivery and payment, related products; a draft or an unknown slug is
    404. Nothing is rendered at build (`generateStaticParams` returns `[]`): a page renders on its
    first visit and is kept until a catalog save revalidates it. Its metadata carries canonical and
    `hreflang` URLs and a JSON-LD `Product` with its `Offer`; absolute URLs are resolved against
    `SITE_URL` (`src/lib/constants/index.ts`), Vercel's own addresses until the production host
    sets its own.
    «Додати в кошик» (`add-to-cart.tsx`) puts the product in the cart and then links to it; out of
    stock it is disabled. Delivery and payment state the checkout's terms: Nova Poshta at its
    rates, paid on delivery; the goods paid on delivery or by a link the manager sends.
  - The catalog's lists: `/catalog/<slug>` (a zone or a category; the header's menu links
    them), `/skin-type/<slug>`, `/concern/<slug>` and `/brand/<slug>` (the landings a product
    page's terms and brand link to; `landing.tsx` makes them, without the page's own facet), and
    `/collection/new|bestsellers|sets|minis` — a collection is a product flag (`COLLECTIONS` in
    `src/lib/constants`), not a document, so an unknown one is 404 without a query. `/brands`
    lists the brands that have a published product, with their counts from `listing.ts`; it
    is `force-dynamic`, as it reads no `searchParams`. Filters, sort and page live in the URL's
    query and are applied on the server: a list reads `searchParams`, so it renders on every
    request — never at build, never cached — and a published product or a new price shows at once. A page fetches every
    published product of its zone or term in one query and `src/lib/listing.ts` filters,
    counts, sorts and slices them in memory (ponytail: fine for hundreds of products; a database
    query per facet when one zone holds thousands). A click on a filter ticks it at once
    (`useOptimistic`) and pushes the new URL; on a phone the filters open in a bottom `Sheet`.
  - `/canvas` (`src/app/[locale]/(shop)/canvas/`) shows every component in every variant; in
    production only to staff.
- **Admin** — `src/app/(payload)/` is generated by Payload and left untouched; the admin speaks
  Ukrainian only; its own components are in `src/components/admin/`, on Payload's UI. Payload
  collections, one per file in `src/collections/` and listed in its `index.ts`: `users` (Payload
  auth), `customers` (Accounts, below), the catalog's, `consultation-requests`, `pages`, `search-synonyms`, `search-misses` and
  `orders`. Payload globals, one per file in `src/globals/` and listed in `payload.config`'s
  `globals`: `care-finder`, `contacts`.
  Every row of `users` is an owner or a cosmetologist; a shopper is a row of `customers`, and no
  rule takes them for staff. `src/lib/access.ts` holds who may do what, and every collection takes
  its access from there (adr-20261029-admin-roles, adr-20261103-customer-accounts).
- **Catalog** — the admin group «Каталог». The storefront reads it through
  `src/lib/actions/product.actions.ts` — `getProduct` and `getRelated`, published products only, a
  draft among related products left out, and `getListingProducts` for the lists — and
  `category.actions.ts` — `getCatalogTerm`, `getSkinTerm`, `getFacets`; it derives what a page
  shows from a product in `src/lib/product-page.ts`, what a list shows from its products and query
  in `src/lib/listing.ts`: within a facet values are OR, across facets AND, and a value's count
  ignores its own facet's choice. Where each piece goes is adr-20261030-code-layout-nextjs-store.
  - Brands; zones and categories as one tree in `categories`: a zone has no parent, a category's
    parent is a zone (`validate`). A zone with categories cannot be deleted (`beforeDelete`): the
    database would set their parent to null and turn them into zones. Nor can a brand that a product
    names, in `products` or in its latest version (a draft saved over a published product lives only
    there): the database would set the product's brand to null, and the brand is required. `fullTitle`
    («Обличчя → Очищення») tells apart categories with the same title in pickers. Skin type, condition and concern are three Payload collections from
    one function, not selects, so the cosmetologist can add a term without a deploy.
  - Products have drafts; anonymous readers see published ones only (`access.read`). Price is
    integer kopiyky, typed in hryvnias through `PriceField`. The product rules — made to order
    needs days, INCI needs its source — are in `src/lib/validators.ts`, and the fields validate
    with them.
    Payload skips validation on a draft, so these rules hold from publishing on; an import or AI
    draft may store an incomplete product. The price alone is checked on a draft too (a field
    hook): money is integer kopiyky everywhere.
  - English texts are Payload's `en` locale. There «Перекласти з української» (`translate-button.tsx`)
    fills the product's empty texts from its Ukrainian version through Chrome's built-in Translator
    API — desktop Chrome and Edge, free, the text never leaves the machine — and saves nothing; it
    marks the product «Чернетка AI», so a person reads the result before it is published. Payload checks `required` only in the locale
    being saved, so a `beforeChange` hook refuses to publish from another locale a product with no
    Ukrainian name.
  - Texts written by AI or brought by the import wait for a person
    (adr-20261030-ai-drafts-and-review): `products.review` is «Чернетка AI», «Імпорт» or
    «Перевірено», and `requireReview` refuses to publish the first two; one status covers both
    languages. «Заповнити з AI» (`ai-draft.tsx`)
    sends the brand's pasted material to `POST /api/products/ai-draft` (`ai-draft-endpoint.ts`),
    where Claude Haiku drafts the Ukrainian texts against a schema with no INCI; the form fills
    what is empty and marks the product «Чернетка AI». Words of a medical claim are flagged as they
    are typed (`src/lib/claims.ts`, `claims-warning.tsx`), never blocked.
  - A slug is one per document, not localized, transliterated from the Ukrainian name (national
    system, `slugify` in `src/lib/utils.ts`, the field in `src/collections/slug-field.ts`): a localized slug has no fallback, so a product without an English slug
    would not be found on `/en`. A slug typed by hand is transliterated the same way: a list's URL
    carries slugs unencoded and comma-joined and drops any that is not `[a-z0-9-]`. A typed slug
    with nothing to transliterate (punctuation only) gives way to the name's, as the field's hint
    promises.
  - Photos in `media`, stored in Vercel Blob (adr-20261028-media-on-vercel-blob). A photo's `url`
    is its public Blob URL (`disablePayloadAccessControl`), not `/api/media/file/…`, which the
    site password closes to `next/image`'s own request (adr-20261029-site-password);
    `images.remotePatterns` admits only our store's host, read from `BLOB_READ_WRITE_TOKEN`.
    Locally photos stay on `/api/media/file/`. The move to R2 needs the same: public URLs, and
    their host in `remotePatterns`.
  - A change the storefront can see calls `revalidatePath('/', 'layout')`; a draft save does not,
    and scripts pass `context.disableRevalidate` (outside a Next request it throws).
  - `npm run seed:catalog` creates the missing zones, categories, vocabularies and brands by slug,
    and the care finder's draft, off, while it has neither questions nor steps; it never overwrites
    what the cosmetologist changed.
  - The owner's «Імпорт» page (`/admin/import`, a Payload admin view) brings our brands' products
    from cosmetika.com.ua as drafts, five per request, and applies a CSV of prices whole or not at
    all; its endpoints sit on `products` (`import-endpoints.ts`) and refuse anyone but the owner
    (adr-20261029-catalog-import). It reads the store's public addresses, as its Store API is
    closed (adr-20261103-import-from-public-pages).
- **Consultation** — a shopper's request to be contacted by the cosmetologist
  (adr-20261030-consultation-requests). `ConsultationDialog` (`src/components/shared/consultation/`)
  opens from «Консультація» in `SiteHeader` and «Запитати косметолога» on a product page, which
  passes its product; Cloudflare Turnstile's invisible widget is `turnstile.tsx`. The form's
  action and the server action `requestConsultation` (`src/lib/actions/consultation.actions.ts`)
  check the same `consultationRequest`; then Turnstile (`src/lib/turnstile.ts`), then the
  `consultation-requests` collection (admin group «Запити»), which no role creates through the
  API and whose sent fields no role changes — only the status. Telegram is told in `after()`.
  From a routine the dialog passes the care finder's answer ids; `requestConsultation` reads the
  questionnaire in Ukrainian and stores `finderAnswers`, a line «Питання — відповідь» each, so the
  cosmetologist reads them as they were sent (adr-20261101-care-finder-answers-to-terms), and
  Telegram carries them (adr-20261102-orders-and-answers-in-telegram).
- **Search** — products by name, brand or active ingredient, in either language and either
  script (adr-20261031-search-in-memory). «Пошук» in `SiteHeader` opens `SearchDialog`
  (`src/components/shared/search/`): from two letters, up to six products through the server
  action `suggestProducts` (`suggest.actions.ts`), which never writes. Enter or «Усі результати»
  opens `/search?q=` (`(shop)/search/`, `noindex`, `force-dynamic`): up to 48 cards, or
  `SearchEmpty` with the way to the brands and to the cosmetologist. Both call `searchProducts`
  (`search.actions.ts`, `server-only`), which reads every published product's names, brand and
  actives and the synonyms, and ranks them in memory with `findProducts` (`src/lib/search.ts`,
  pure). Its normalisation is `slugify`'s transliteration: changing `slugify` changes what search
  finds. Admin group «Пошук»: `search-synonyms` (groups of spellings, one per line; both roles
  keep them) and `search-misses` — the queries the results page found nothing for, written in
  `after()` by `recordSearchMiss` alone, at most `SEARCH_MISSES` different ones.
- **Favorites** — the products a shopper marked with a heart, kept in their browser
  (adr-20261031-favorites-in-the-browser). `src/lib/favorites.ts` keeps the ids in localStorage
  on `browserStore` (`src/lib/browser-store.ts`, behind `useSyncExternalStore`), which the cart
  shares; the server and the first render see none, so no page reads a cookie. `FavoriteButton`
  sits over each `ProductCard`'s photo — beside the card's link, not in it — and under the cart
  button on a product page; `FavoritesLink` in `SiteHeader` shows the count. `/favorites`
  (`(shop)/favorites/`, `noindex`, `force-dynamic`): `FavoritesList` asks the server action
  `productCards` (`product-cards.actions.ts`) for the cards through `getListingProducts`, shows
  them through `FavoritesView`, and takes out of the favorites what the server did not return.
- **Cart and orders** — guest checkout, launch step 1 (adr-20261101-cart-and-checkout,
  adr-20261028-own-orders-collection). `src/lib/cart.ts` keeps `[{id, qty}]` in localStorage on
  `browserStore`; «Додати в кошик» on a product page adds one, `CartLink` in `SiteHeader` counts
  the units. `/cart` (`(shop)/cart/`, `noindex`, `force-dynamic`): `CartList` gets the cards from
  `productCards` and shows them through `CartView` — the lines (`CartLine`), the total and
  `CheckoutForm` under it. The form and the server action `placeOrder` (`order.actions.ts`) check
  the same `orderRequest`; then Turnstile, then `priceOrder` (`src/lib/orders.ts`, pure) reprices
  from the database and answers `changed` when the total is not the one shown, or the order is
  created. `/cart/thanks?order=N` shows the number from the URL only. The `orders` collection
  (admin group «Продажі»): no role creates one through the API, the snapshot and what the shopper
  sent are read-only, the status moves forward only (`canMoveStatus`) and the manager's note is
  free. Telegram is told in `after()`, from the saved order
  (adr-20261102-orders-and-answers-in-telegram). Playwright (`tests/e2e/`, the CI job `e2e`) orders
  through the real pages against a Nova Poshta stub.
- **Care finder** — questions that lead to a routine (adr-20261101-care-finder-answers-to-terms).
  The Payload global `care-finder` (`src/globals/care-finder.ts`, «Каталог → Підбір догляду», both
  roles) holds `enabled`, the questions with the skin terms each answer means, and the routine's
  steps with their categories; off, the menu has no item and `/care-finder` is 404.
  `finder.actions.ts` (`server-only`) reads it — `getFinder`, `isFinderOn` — and `getRoutine` takes
  the steps' published in-stock products through `getListingProducts` and ranks them with
  `routine` (`src/lib/finder.ts`, pure, with `profile` and `answersText`). `/care-finder`
  (`(shop)/care-finder/`, `force-dynamic`): `FinderQuestions`, one question a screen in the
  browser, pushes the answer ids to `?a=`; the page then renders `Routine` (`noindex`), whose
  «Отримати консультацію» carries them (Consultation, above). Answers are validated by
  `finderAnswers` (`validators.ts`).
- **Accounts** — a shopper's registration, sign-in and cabinet, and staff's way in
  (adr-20261103-customer-accounts, adr-20261103-phone-sign-in). The collection `customers` (admin
  group «Продажі») is Payload auth with `verify`; only the owner changes or deletes one through the
  API. A shopper signs in by a number or an email, staff by email; a number is one account's and
  nobody proves it. `/account`
  (`(shop)/account/`, `noindex`, `force-dynamic`): signed out, the forms; a shopper, their data and
  orders; staff, a redirect to `/admin`. `/account/verify?token=` and `/account/reset?token=` are a
  letter's pages. The server actions are in `account.actions.ts` — `signIn`, `register`,
  `resendVerification`, `requestReset`, `resetPassword`, `signOut`, `updateProfile`, `isSignedIn` —
  and the reads in `customer.actions.ts` (`server-only`). Turnstile stands in front of registration,
  a request for a letter, sign-in by number and a new number in the profile; sign-in by email passes
  none, as `/api/customers/login` takes it anyway. `AccountLink` and the menu sheet's item link
  to `/account` and read no session, so cached pages stay cached; a plain click asks `isSignedIn`
  (`useAccountEntry`) and, signed out, opens `AccountDialog` over the page, where a shopper stays
  after signing in. `/cart` fills the form from `currentCustomer`, and
  `placeOrder` ties the order to the session (`orders.customer`). `src/lib/auth-writes.ts` wraps the
  database adapter's `updateOne`, as Payload writes an auth row whole from a snapshot: only an
  operation `markAccessWrites` marked changes who may get in (RULES.md).
- **Mail** — `src/lib/email.ts`: `@payloadcms/email-nodemailer` over SMTP from the `SMTP_*` variables;
  a Production build without them fails, and elsewhere an adapter sends nothing. It holds the letters,
  whose texts come from `messages/*.json` in the account's language. Payload sends a letter inside
  its transaction, so SMTP has timeouts of seconds, and `requestReset` sends reset letters one at a
  time per process (adr-20261103-customer-accounts).
- **Delivery** — Nova Poshta's settlement and warehouse search for the checkout
  (adr-20261101-cart-and-checkout). `DeliveryFields` in `/cart`'s folder calls the server actions
  `findSettlements` and `findWarehouses` (`delivery.actions.ts`, an answer cached 12 hours), which
  call `src/lib/novaposhta.ts` (`server-only`). `NOVA_POSHTA_API_KEY` is optional; any failure
  turns the two fields into plain text ones. Waybills and tracking are not built.
- **Notify** — `src/lib/telegram.ts`: plain-text messages to the owner's Telegram group
  (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`; without them nothing is sent): consultation requests
  and orders, each kept within Telegram's limit with its link to the admin
  (adr-20261102-orders-and-answers-in-telegram). It knows the types of what it tells and how money
  is written, and no domain's code.
- **Configuration** — `src/payload.config.ts` reads the environment through `src/lib/env.ts` (Zod;
  an error names variables, never values). Content localization `uk`/`en`, `uk` default and
  fallback.
- **Schema** — migrations in `src/migrations/`, applied before every Production deploy; a Preview
  never migrates; locally Payload pushes the schema itself. CI fails when a collection changes
  without a migration.
- **Development host** — Vercel Hobby + Neon; Production behind the site password, Previews behind
  Vercel Authentication (adr-20261029-site-password). Vercel's GitHub App
  deploys every push: `master` → Production (migrations, then the build), other branches →
  Preview (build only, same database); CI runs on pull requests and is not a gate before the
  deploy (adr-20261028-vercel-git-deploys). Photos in one Vercel Blob store shared by every
  environment (adr-20261028-media-on-vercel-blob).

## Intended — not built yet

Everything below is a decision, not a description of code. The task that builds a part moves it
out of this heading.

### Domains

One Next.js application with Payload CMS inside it (adr-20261028-next-payload-single-app);
frontend and backend are separated by folders, not services. A domain is a set of files, not a
folder of its own: its collection in `src/collections/`, its reads and mutations in
`src/lib/actions/<x>.actions.ts`, its integrations in `src/lib/<x>.ts` — their pure parts; a call
an endpoint makes may sit in the endpoint, as the import's and the AI draft's do — its schemas in
`src/lib/validators.ts` (adr-20261030-code-layout-nextjs-store).

- **Storefront** (`src/app/[locale]/`, `src/components/shared/`, `src/components/ui/`,
  `src/i18n`, `messages/`) — pages in `uk` at `/` and `en` at `/en` — the layout, its look,
  `/canvas`, the header, the pages, the product page, the catalog's lists, the consultation dialog,
  search, favorites, the cart and the care finder are built (above). Knows domains through
  their actions, their pure helpers (`src/lib/listing.ts`, `src/lib/product-page.ts`) and their
  schemas (`src/lib/validators.ts`); never through a collection — `AdminLink`'s `/api/users/me`
  is the one exception (adr-20261030-header-menu-and-pages-from-payload).
- **Admin** (`src/app/(payload)/admin`, `src/components/admin/`) — Payload's admin in Ukrainian
  for the Owner and the Cosmetologist.
- **Catalog** (the catalog's `src/collections/`, `product.actions.ts`, `category.actions.ts`,
  `listing.ts`, `product-page.ts`) — the model, the product page's queries and the lists'
  filters and facets are built (above); collections are not. Depends on nothing else.
- **Pages** (`src/collections/pages.ts`, `page-blocks.ts`, `page.actions.ts`) — the store's
  own pages, built (above). Its blocks show catalog data through the catalog's actions; depends on
  catalog.
- **Search** (`src/lib/search.ts`, `search.actions.ts`, `suggest.actions.ts`, `search-synonyms`,
  `search-misses`) — built (above). Depends on catalog.
- **Orders** (`src/collections/orders.ts`, `src/lib/orders.ts`, `order.actions.ts`) — cart
  repricing, checkout, the `orders` collection and its statuses are built (above). Depends on
  catalog.
- **Accounts** (`src/collections/customers.ts`, `account.actions.ts`, `customer.actions.ts`,
  `src/lib/auth-writes.ts`, `src/lib/email.ts`) — built (above). It meets orders in one field,
  `orders.customer`: `placeOrder` fills it from `currentCustomer`, `myOrders` reads it.
- **Payments** (`src/lib/monobank.ts`) — monobank invoices, webhook, reconciliation
  (adr-20261028-monobank-and-cash-on-delivery). Depends on orders.
- **Delivery** (`src/lib/novaposhta.ts`, `delivery.actions.ts`) — the search of settlements and NP
  warehouses is built (above); waybills and tracking are not. Depends on orders.
- **Care finder** (`src/globals/care-finder.ts`, `src/lib/finder.ts`, `finder.actions.ts`) —
  questions, what answers mean, routines; built (above). Depends on catalog. Consultation depends
  on it: a request reads the questionnaire for its answers' text — the developer's decision after
  the task `care-finder`'s architecture review, against this line's earlier direction.

### Boundaries and dependency direction

- Domains depend on `catalog`, never on each other's internals; payments and delivery depend on
  orders, not the other way.
- Each external integration (monobank, Nova Poshta, Telegram, SMTP) is one module without a port
  interface; an abstraction comes with a second implementation.
- Every boundary is a Zod schema in `src/lib/validators.ts`: a storefront form and the server
  action it calls share one, as do a webhook, an import and a supplier's answer
  (`cosmetikaProduct`, `priceRow`).

### Runtime flows

1. **Browse.** A request to `/` or `/en/...` → next-intl resolves the locale → a server component
   queries Payload's Local API with the filters from the URL → HTML with the localized fields;
   a product page is cached until a Payload hook revalidates it on save, a list renders on every
   request.
2. **Order (launch step 1).** Cart in localStorage → checkout server action → Zod → reprice from
   the database → an `orders` record with a snapshot → Telegram to the owner → manager
   confirmation → cash on delivery or a payment link (adr-20261028-two-step-launch). Built up to
   Telegram; the confirmation and the link are the manager's, by hand.
3. **Card payment (launch step 2).** Order fully in stock → a monobank invoice → redirect →
   signed webhook → verify → idempotent forward-only status change → Checkbox issues the fiscal
   receipt on monobank's side; a cron reconciles invoices without a webhook.

### Deployment

Production: a Docker image built in GitHub Actions after the CI gate, pushed to GHCR, run by
Coolify on a Hetzner VPS with Postgres alongside; media in Cloudflare R2; Cloudflare in front
(adr-20261028-hetzner-coolify-hosting). Until the roadmap item `production host` builds it,
development deploys to Vercel instead — see "Built" below.

## System-wide constraints and invariants

See `RULES.md`. Content rules: adr-20261028-reviewed-ai-content-drafts. Languages:
adr-20261028-storefront-languages-uk-en.
