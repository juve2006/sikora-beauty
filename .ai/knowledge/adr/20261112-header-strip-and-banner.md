---
id: adr-20261112-header-strip-and-banner
type: adr
status: accepted
date: 2026-11-12
domains:
  - storefront
paths:
  - src/components/shared/header/top-bar.tsx
  - src/components/shared/blocks/hero.tsx
  - src/components/shared/blocks/hero-slider.tsx
  - src/components/shared/blocks/trust-badges.tsx
  - src/components/shared/blocks/page-blocks.tsx
  - src/components/ui/carousel.tsx
  - src/lib/blocks.ts
  - src/lib/constants/index.ts
  - "src/app/*/globals.css"
  - src/components/shared/header/index.tsx
summary: The header's olive strip (free delivery, «Акції», language and theme) over a header in the page's tokens, the free-delivery threshold, and the home's full-width banner that becomes a slider; refines the look ADR's header scope
reviewed_at: 2026-11-12
---
# Only a strip over the header is olive, and the home's banner is a photo across the page, a slider when there are several

Refines adr-20261112-storefront-look-rosynaskin: its header token scope `.site-header` becomes the
strip's `.top-bar`, and the rest of the header takes the page's tokens. Refines
adr-20261109-waybills-and-prepayment-only-start: for an order from `FREE_DELIVERY_FROM` on, the sender
pays the delivery.

## Context

The client's home mockup (`.ai/workspace/client-feedback-2026-11-12/68-home-mockup.png`) has a thin
olive strip — free delivery from 3500 грн, «Акції», the languages — over a light header, and a banner
across the page: a photo of fabric and a branch behind «YOUR BEAUTY EDIT.», a subtitle, a text, a
pill button, three promises and «01 — 03» with arrows. The developer asked for that header and banner
with the theme toggle in the strip too, and decided: «Акції» is a page in the admin, free delivery is
said in the strip and at the checkout, several banners are a slider. Task `header-hero`.

## Decision

- **The strip** is `TopBar` (`src/components/shared/header/top-bar.tsx`), the header's first row:
  «Безкоштовна доставка від 3500 грн», «Акції» → `/promotions` and, from `sm`, `LanguageSwitcher`
  and `ThemeToggle`; below `sm` those two stay in `MobileMenu`'s sheet. It is the token scope
  `.top-bar` in `globals.css`, the client's olive and cream in both themes. The rest of the header is
  the page's tokens, cream by day and dark at night; the whole header stays sticky.
- **Free delivery** starts at `FREE_DELIVERY_FROM` (`src/lib/constants/index.ts`, kopiyky): the strip,
  the product page's delivery line, the checkout's line under the delivery and the seed's «Оплата та
  доставка» read it. The order's sum and the waybill do not: the seller makes such a waybill with
  the sender paying.
- **«Акції»** is a page of `pages` with the slug `promotions`, written in the admin; no collection, no
  discount on products.
- **The banner** (`hero`) spans the column's width with its photo behind the text, which stands on the
  photo's left over a fade of `--background`, so a photo keeps it legible in both themes; a title of
  at most `max-w-2xl`, a localized `subtitle`, the text, a pill button, and `TrustBadges` — three
  promises in `messages/*` (`Hero.trust`), the same on every banner, not fields.
- **Banners in a row are one slider**: `groupBanners` (`src/lib/blocks.ts`) gathers consecutive `hero`
  blocks, and `HeroSlider` shows two or more through shadcn's Carousel (embla, looping) with
  «01 — 03» and two arrows, over the banner from `sm`, under it on a phone. One banner has no
  controls. Only the first slide of the page's first group carries the page's `h1`.

## Alternatives

- **The whole header olive, as before** — the mockup's header is light; only the strip is olive.
- **«Акції» from a discount on products** — no product has a discount yet; a page the owner writes is
  enough until one does.
- **Free delivery in the strip only** — a shopper reads the rule where they pay too.
- **One banner with a static «01 — 03»** — a counter that counts nothing.
- **The promises as banner fields** — six more fields per banner in two languages for words that
  never change between banners.
- **CSS scroll-snap instead of embla** — no loop and no arrows without the same amount of script;
  shadcn's Carousel is the project's components' source (convention-storefront-components).
- **The mockup's photo from the site it was found on** (tangassi.com) — no license there; the
  developer picks a free photo, and the owner uploads it as the banner's «Фото».

## Consequences

- The migration `20261112_134121_hero_subtitle` adds `pages_blocks_hero_locales.subtitle`; until it
  runs on Production, a Preview of the change breaks on pages with a banner (docs/deploy.md, step 23).
- `.site-header` is gone, and with it the menu panel's place in the selector lists of `:root` and
  `.dark`: the panel opens on the page's tokens.
- The banner leaves the column's padding by `-mx-4 sm:-mx-6` in `PageBlocks`: a change of the
  column's padding changes it too.
- Changing the threshold is the constant and, by hand, «Оплата та доставка» in the admin.
- `src/lib/novaposhta.ts` still sends `PayerType: 'Recipient'` for every waybill: making the 3500
  rule automatic is a task of its own.
