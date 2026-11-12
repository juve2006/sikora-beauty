---
id: adr-20261030-header-menu-and-pages-from-payload
type: adr
status: accepted
date: 2026-10-30
domains:
  - storefront
  - pages
paths:
  - "src/app/*/(shop)/layout.tsx"
  - "src/app/*/(shop)/page.tsx"
  - "src/app/*/(shop)/*/page.tsx"
  - "src/components/shared/header/**"
  - "src/components/shared/blocks/**"
  - src/collections/pages.ts
  - src/collections/page-blocks.ts
  - src/lib/actions/page.actions.ts
  - src/lib/actions/category.actions.ts
summary: The header's menu comes from Payload in (shop)/layout.tsx, so pages the build would prerender are force-dynamic; store pages are a pages collection of blocks with reserved slugs; the admin link is checked in the browser
reviewed_at: 2026-11-12
---
# The header's menu and the store's pages are read from Payload, never at build; pages are a collection of blocks

Since adr-20261112-storefront-look-rosynaskin (2026-11-12) the menu also offers a zone marked
«Окремий пункт меню» and «Консультація»; the skin concerns and the collections are hidden from it.

## Context

The roadmap's `header, home and about` asked for a header with the catalog's navigation, a home
page and an about page, the last two as Payload globals or messages. The catalog's terms already
live in Payload (zones, categories, skin concerns) and the owner names and orders them there; the
owner also wants to change the home page's texts and order without a developer. `next build` runs
in CI without a database (RULES.md). Source: task `header-home-and-about`, the developer's
decisions at its gate of 2026-10-30.

## Decision

- Every storefront page under `src/app/[locale]/(shop)/` gets its header from `(shop)/layout.tsx`.
  `SiteHeader` reads the menu with `getMenu(locale)` — the zones with their categories and the
  skin concerns, in the admin's order (`_order`), with `overrideAccess: false` — so a new or
  renamed term is in the menu at once, without a deploy. Brands, the collections and the about
  page are fixed links.
- Because the layout reads Payload and renders beside the page, a page's own `connection()` does
  not stop the build reaching the database. A page that `next build` would otherwise prerender —
  the home page, `/brands`, `/canvas` — exports `dynamic = 'force-dynamic'`. Pages with
  `generateStaticParams` returning `[]` (a product, a page by slug) stay as they were: rendered on
  the first visit and kept, header included, until a save in the admin revalidates the layout
  (`storefrontHooks`, `revalidatePath('/', 'layout')`), so a renamed category reaches their menu
  too.
- Pages are the collection `pages`, not globals: a page is a title, a slug and blocks — `hero`,
  `products`, `tiles`, `consultation`, `text`. The slug `home` is the home page; any other slug is
  `/<slug>`. A slug may not be a section of the store (`RESERVED_SLUGS`, checked against the
  `(shop)` folders by a test). A banner's button links only inside the store (`internalPath`),
  checked on save and again when rendered. Texts are plain textareas split into paragraphs on a
  blank line, not rich text.
- Anyone reads pages; editors write them (owner and cosmetologist), only the owner deletes. A page
  has no drafts: a save is live at once.
- A block's GraphQL type is named after its slug unless it says otherwise: `products` is
  `interfaceName: 'ProductsBlock'`, since the `Products` collection already owns that name.
- «Адмінка» in the header is shown by the browser: `AdminLink` asks `/api/users/me` once per page
  load, checks the answer with `adminSession` and shows the link to a signed-in admin user. The
  server never reads the cookie for it; this is the storefront's one read of Payload outside a
  server component (convention-storefront-components).
- On a phone (below `sm`) the language and the theme sit at the bottom of the menu sheet, so the
  header keeps one line at 360 px (the developer's decision at review).
- Search, favorites and the cart join the header with their own roadmap items, not as disabled
  icons now.

## Alternatives

- **Two globals, «Головна» and «Про нас»** (the roadmap's wording) — neither can be deleted, but
  each carries its own set of block tables, and the legal pages of `launch readiness` would need
  more globals or a move into a collection.
- **The menu from constants** (`seed-data`), as the zones were — a header without a database, but
  a term named or added in the admin reaches the menu only with a deploy.
- **The about page's text in `messages`** — less code, but only a developer changes it.
- **Rich text (Lexical)** — formatting, at the price of a converter on the storefront; paragraphs
  and block titles are enough.
- **An ISR home page** — cached, but the build cannot prerender it without a database.
- **The admin link decided on the server from the cookie** — `cookies()` would make every page
  dynamic, product pages included, and lose their cache.
- **Disabled search, favorites and cart icons now** — a shopper presses what does not work.

## Consequences

- Every storefront request reads the menu (two small queries, `cache`d per request); ponytail:
  fine at the store's traffic, `unstable_cache` with a tag when it is not.
- The home page and `/brands` render on every request.
- A new section of the store needs its folder name in `RESERVED_SLUGS`, or the test fails.
- Undoing it: a revert; the migration's `down` drops the `pages` tables with their texts.
