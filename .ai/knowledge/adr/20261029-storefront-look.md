---
id: adr-20261029-storefront-look
type: adr
status: accepted
date: 2026-10-29
domains:
  - storefront
paths:
  - "src/app/*/globals.css"
  - "src/app/*/layout.tsx"
  - components.json
  - postcss.config.mjs
  - "src/components/shared/**"
  - "src/components/ui/**"
summary: "Storefront look: Tailwind v4 + shadcn/ui on theme tokens in [locale]/globals.css, Onest, light and dark themes by an inline script; no prototypes, no next-themes"
reviewed_at: 2026-10-30
---
# The storefront's look lives in theme tokens on Tailwind and shadcn/ui, in a light and a dark theme

Refines the spec's decision "Design": no prototypes for the owner to choose from.

## Context

The storefront had a placeholder page and nothing to build `product-page` or `catalog-listing` on.
The spec planned 2–3 prototypes for the owner to choose from; the stack named Tailwind CSS v4 and
shadcn/ui. On 2026-10-29 the developer chose direction A, "clinical clean", without prototypes:
the owner looks at `/canvas` or at the deployed site, and a change after their feedback is a change
of token values. They also asked for a light and a dark theme with a switch. Source: task
`design-direction`, gates of 2026-10-29.

## Decision

- **Tailwind CSS v4** through `@tailwindcss/postcss`, and **shadcn/ui** (style `radix-nova`,
  `components.json`) with its components in `src/components/ui/`. shadcn's code is ours: a
  component is added with `npx shadcn add` and edited in place.
- **One stylesheet, one root layout.** `src/app/[locale]/globals.css` is imported only by
  `src/app/[locale]/layout.tsx`. Payload's admin has its own root layout, so Tailwind's preflight
  never reaches it.
- **Theme tokens.** Colours and the radius are shadcn's CSS variables in `globals.css`: `:root`
  for the light theme, `.dark` for the dark one, mapped to Tailwind classes by `@theme inline`.
  Text and accent keep WCAG AA contrast to their background in both themes.
- **One typeface**, Onest, through `next/font/google` with the `cyrillic` subset: self-hosted at
  build time, and Ukrainian letters (Ґ, ї, є, І) render in it, not in a fallback. Manrope was the
  other candidate.
- **Two themes without a dependency.** An inline script in the layout's `<head>` sets the `dark`
  class on `<html>` before the first paint, from `localStorage.theme` or else
  `prefers-color-scheme`. `ThemeToggle` flips the class and stores the choice; its icons switch by
  `dark:` classes, so nothing reads the theme during render.

## Alternatives

- **2–3 prototypes for the owner** (the spec) — the owner looks at the real components instead,
  while no page is built on them and a change is still cheap.
- **`next-themes`** — what shadcn's documentation uses, but its last release (0.4.6) is from March
  2025, and it renders a `<script>` from a client component, which React 19 warns about in
  development. About twenty lines do the same for two themes.
- **The theme in a cookie, read on the server** — `cookies()` makes every page dynamic and breaks
  the catalog's cache, which `revalidatePath` refreshes.
- **A third choice, "as the system"** — needs a menu instead of one button; the system theme
  applies anyway until the shopper picks one.
- **Our own design system, CSS Modules** — the developer's instruction: the storefront is built on
  shadcn/ui.

## Consequences

- A new direction is new token values in `globals.css` and a font in `layout.tsx`, as long as
  components carry no raw values (convention-storefront-components). Each page built on the
  tokens makes a change of face cheaper than a rewrite, never free.
- A shopper with JavaScript off gets the light theme. The theme is per browser, not per account.
- `src/app/[locale]/icon.svg` holds the accent and its text colour as raw values: a favicon cannot
  read CSS variables.
- Removing the dark theme is the `.dark` block, the script and `ThemeToggle`; components do not
  change.
