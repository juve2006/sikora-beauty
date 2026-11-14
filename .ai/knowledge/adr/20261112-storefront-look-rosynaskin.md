---
id: adr-20261112-storefront-look-rosynaskin
type: adr
status: accepted
date: 2026-11-12
domains:
  - storefront
paths:
  - "src/app/*/globals.css"
  - "src/app/*/layout.tsx"
  - components.json
  - postcss.config.mjs
  - "src/components/shared/**"
  - "src/components/ui/**"
  - src/collections/categories.ts
  - src/lib/actions/category.actions.ts
summary: "Storefront look: the owner's olive and cream on shadcn's tokens, Onest and Playfair Display headings, the header a token scope of its own, and what the header's menu offers; supersedes direction A"
reviewed_at: 2026-11-14
---
# The storefront wears ROSYNASKIN's olive and cream, with a serif for headings, and its header is a token scope of its own

Supersedes adr-20261029-storefront-look, whose direction A, "clinical clean", and single typeface this
replaces; its mechanics stay and are repeated below. Refines adr-20261030-header-menu-and-pages-from-payload:
what the header's menu offers.

Since task `home-ui-fixes` (2026-11-14, the developer's word against the home mockup) the menu is the
header's from `md`, not `lg`, and the consultation a button in the header below `md`; from `xl` the
menu is centred, and the icons stand as the mockup orders them: search, favorites, the account, the
cart.

## Context

On 2026-11-12 the owner sent the store's look: the name ROSYNASKIN, a logo, the colours — the top
`#596653` (deep olive) with `#F5F1E8` text, the bottom `#F5F1E8` with olive text — and two mockups:
the current site recoloured, and a home page with serif headings and a menu of Каталог, Бренди,
Beauty-гаджети, Про Rosyna Skin, Консультація. The developer decided: the colours as described, a dark
theme derived from them, the home mockup as a requirement, «За потребами шкіри» and «Набори та
новинки» hidden but not deleted, gadgets a separate item; at the gate, "use the codes you were sent".
Source: `.ai/workspace/client-feedback-2026-11-12/`, task `rosyna-skin-look`.

## Decision

- **Unchanged mechanics.** Tailwind CSS v4 through `@tailwindcss/postcss` and shadcn/ui (`radix-nova`,
  `components.json`), its components in `src/components/ui/`, ours to edit. One stylesheet,
  `src/app/[locale]/globals.css`, imported only by the locale layout, so Tailwind never reaches
  Payload's admin. Colours and the radius are shadcn's variables there: `:root` light, `.dark` dark,
  mapped by `@theme inline`; text keeps WCAG AA against its background. Two themes without a
  dependency: an inline script in `<head>` sets `dark` on `<html>` before the first paint, from
  `localStorage.theme` or `prefers-color-scheme`; `ThemeToggle` flips and stores it.
- **The palette.** Light: background `#f5f1e8` (cream), primary `#596653` (olive) with `#f5f1e8` on it,
  secondary text in the olive (5.4:1), body text a derived olive-black `#2d3329`. Dark: the same olive
  at night — background `#161a15`, cream text, primary a light olive `#b3bfa6` with dark text. The
  client's two codes are used as they are wherever the client placed them; a derived value fills only
  what they did not say (hover, borders, the dark page).
- **The header is a token scope**, `.site-header` in `globals.css`, like `.dark`: the client's olive and
  cream in both themes. It renames the generic tokens (`--background`, `--foreground`, `--muted`,
  `--primary`, `--accent`, `--ring`, `--border` and their foregrounds) for everything on it, so
  `Button`, the menu's triggers, `Logo`, the counts and the current language need no variant. A menu
  panel opens inside the header, not in a portal, so `[data-slot='navigation-menu-content']` inside it
  stands in the selector lists of `:root` and `.dark` and takes the page's tokens back.
- **The footer** is the page's cream under a line, its text and logo in `--primary` (olive; light
  olive in the dark theme).
- **Two typefaces**, both through `next/font/google` with the `cyrillic` subset, so ґ, є, і, ї are
  their own: Onest for text, Playfair Display for headings as `--font-heading` — every `h1` by a base
  rule, the page blocks' titles by `font-heading`, shadcn's dialog and sheet titles already.
- **The header's menu**: Каталог (the zones with their categories), Бренди, every zone marked
  «Окремий пункт меню» (`menuItem` on `categories`, offered for a zone only) as an item of its own — a
  panel of its categories, or a link while it has none — Про ROSYNASKIN, and Консультація, which opens
  the consultation's dialog (below `lg` it stays a button in the header). A marked zone stays in
  Каталог and in the footer too. The skin concerns and the collections are hidden by
  `SHOW_CONCERNS_AND_COLLECTIONS = false` in `src/lib/constants/index.ts`, not deleted; their pages
  and the catalog's filters still work. From `xl` the logo, the menu and the icons share one row; the
  header's buttons are icons, their words for screen readers only.

## Alternatives

- **The header as `bg-primary` renamed by `[--x:var(--y)]`, as the footer was** — in the dark theme
  `--primary` is the light olive, and the header would become a light band.
- **`--header-*` tokens, as shadcn's `--sidebar-*`** — the shared components read the generic tokens,
  so the header would rename them anyway.
- **Swapping `--primary` and `--primary-foreground` by `var()` on the header** — a cycle; both become
  invalid.
- **A deeper olive `#3b4537` for the header at night** — the first design; the developer at the gate:
  the client's codes as they are.
- **Gadgets by a fixed slug, without a migration** — the owner would have to guess the address, and a
  rename breaks it silently.
- **Gadgets as a section of their own, not a zone** — a second catalog, filters and pages; a zone has
  them.
- **Deleting the two hidden items** — the developer: they may come back.
- **Other serifs with Cyrillic**: Cormorant Garamond (thin at 24 px), Lora (calmer, less like the
  mockup), Prata (one weight).
- **A white page with cream only in the footer** — the client's description says cream.

## Consequences

- A change of face is still token values in `globals.css` and fonts in the layout, as long as
  components hold no raw value (convention-storefront-components); the header's values are a third
  block there.
- Raw colours outside it, changed with it: `src/app/[locale]/icon.svg` (the light `--primary` and its
  text) and `src/app/(payload)/custom.scss` (`--primary` and its text of both themes).
- A component that renders inline inside the header and must look like the page needs its selector
  in the lists of `:root` and `.dark`, as the menu's panel has.
- A second font is a second download on the first visit (self-hosted, `display: swap`).
- Undoing the menu flag: the migration `20261112_084909_menu_item`'s `down` drops the column; the
  zone itself stays.
