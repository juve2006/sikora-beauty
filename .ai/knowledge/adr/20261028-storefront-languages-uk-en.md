---
id: adr-20261028-storefront-languages-uk-en
type: adr
status: accepted
date: 2026-10-28
domains: []
paths:
  - "src/i18n/**"
  - "messages/**"
  - "src/app/**"
summary: Storefront uk at / and en at /en via next-intl; content via Payload localization
---
# The storefront is Ukrainian by default and English at /en, through next-intl and Payload localization

## Context

The developer wants shoppers to choose Ukrainian or English, Ukrainian by default. Locale routing
touches every page, so it has to exist from the first page on. The admin is used by
Ukrainian-speaking, non-technical people. Source: spec `sikora-beauty`.

## Decision

- UI strings and locale routing through **next-intl**: `uk` at `/` without a prefix, `en` under
  `/en` (`localePrefix: 'as-needed'`), a language switcher, `hreflang` alternates; strings in
  `messages/uk.json` and `messages/en.json`.
- Content through **Payload localization**: `locales: ['uk', 'en']`, `defaultLocale: 'uk'`,
  `fallback: true`; text fields are localized; prices, INCI, SKU and images are not.
- The admin UI in Ukrainian (Payload's built-in `uk` translation).

## Alternatives

- **Ukrainian only** — rejected: the developer wants English.
- **Next.js dictionaries without a library** — rejected: locale routing, typed messages and
  formatting would be written by hand.
- **Paraglide** — rejected: less established with the App Router.

## Consequences

- Every UI string goes through `messages/`; the two files must keep the same keys.
- English content is drafted by AI and reviewed; until a field is translated, `/en` shows the
  Ukrainian text.
- Durable project artifacts (knowledge, ADRs, specs, code comments) are in English regardless.
