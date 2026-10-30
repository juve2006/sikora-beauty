---
id: adr-20261030-code-layout-nextjs-store
type: adr
status: accepted
date: 2026-10-30
domains: []
paths:
  - "src/**"
  - "tests/**"
  - .prettierrc
  - .prettierignore
  - vitest.config.ts
summary: "Code laid out and written as in the developer's nextjs-store: kebab-case files, components/shared and admin, lib/actions, validators, constants, types, tests/, export default, prettier"
reviewed_at: 2026-10-30
---
# The code is laid out and written as in the developer's nextjs-store

## Context

The developer keeps one way of writing Next.js across projects: the layout and style of their
`nextjs-store`. This store started with its own — domain folders (`src/catalog/`), PascalCase
component files, named exports, no semicolons — and the developer chose to bring it in line
(2026-10-30, task `code-style-nextjs-store`). nextjs-store has no CMS, so where Payload's pieces go
is decided here.

## Decision

```text
src/
├── app/[locale]/…            pages; a component only one page uses lives in its route's folder
│                             (/canvas, which shows every component, does not count)
├── components/
│   ├── ui/                   shadcn
│   ├── shared/<area>/        components more than one page uses: header/, product/, catalog/
│   └── admin/                Payload admin components (Payload's UI, not shadcn)
├── collections/              Payload collections, their fields and hooks, one collection per file
├── db/                       seed.ts and its data
├── lib/
│   ├── actions/<x>.actions.ts  the storefront's reads, `import 'server-only'`; a mutation the
│   │                           browser calls is a file with 'use server'
│   ├── constants/index.ts    constants, SCREAMING_SNAKE_CASE
│   ├── validators.ts         every Zod schema at a boundary (RULES.md: input from outside)
│   ├── utils.ts              small pure helpers: cn, money formatting, slugify
│   └── <topic>.ts            the rest: access, env, listing, cosmetika, prices…
├── types/index.ts            types more than one module uses, z.infer of the validators
├── i18n/ · migrations/ · proxy.ts · payload.config.ts · payload-types.ts   where their tools want them
tests/                        every *.test.ts
```

- File names are kebab-case; a folder's main component may be its `index.tsx`.
- A component or page is `const Name = (…) => {…};` and `export default Name;`, one per file;
  `generateMetadata` and the like stay named, as Next requires. Modules outside components export
  by name.
- Formatting is prettier's with `.prettierrc` (single quotes, semicolons, 80 columns): `npm run
  format`, checked by the CI job `format`. Payload's generated files are in `.prettierignore`.
- Payload refers to an admin component by its file, `'/components/admin/price-field'`; the import
  map (`npm run generate:importmap`) records it as `#default`.

## Alternatives

- **Domain folders** (`src/catalog/`, later `src/orders/`, each with its `schema.ts`) — what the
  store had: everything about one domain in one place. Rejected for one layout across the
  developer's projects.
- **`'use server'` on the reads, as nextjs-store does** — a server action is a POST endpoint that
  Next runs one at a time and never caches; reads stay plain server functions.
- **No `src/`, as nextjs-store** — `src/` is Payload's template and the imports read the same
  (`@/lib/…`); moving it would only edit tsconfig, Payload's config, the import map and the tools.
- **Tests next to the code** — what the store had; nextjs-store keeps them in `tests/`.

## Consequences

- A new domain is files, not a folder: `lib/actions/order.actions.ts`, `lib/monobank.ts`,
  `collections/orders.ts`, its schemas in `validators.ts`, its types in `types/index.ts`.
  `validators.ts` and `types/index.ts` grow with every domain.
- A shadcn component added by its CLI is formatted (`npm run format`) before CI accepts it.
- Every file moved once; `git log --follow` keeps their history because the moves were committed
  apart from the edits.
- Decision records and the spec written before this one keep the old paths; read them as:

  | They name | Now |
  |---|---|
  | `src/access.ts`, `src/env.ts` | `src/lib/access.ts`, `src/lib/env.ts` |
  | `src/catalog/products.ts`, `collections.ts`, `slug.ts`… | `src/collections/<collection>.ts`, `slug-field.ts` |
  | `src/catalog/storefront.ts` | `src/lib/actions/product.actions.ts`, `category.actions.ts` |
  | `src/catalog/schema.ts`, `src/<domain>/schema.ts` | `src/lib/validators.ts` |
  | `src/catalog/<Name>.tsx` (admin) | `src/components/admin/<name>.tsx` |
  | `src/components/<Name>.tsx` | `src/components/shared/<area>/<name>.tsx`, or the route folder |
  | `src/payments/mono.ts`, `src/delivery/novaposhta.ts`, `src/notify/telegram.ts` (spec) | `src/lib/monobank.ts`, `src/lib/novaposhta.ts`, `src/lib/telegram.ts` |
  | `scripts/seed-catalog.ts`, `src/catalog/seed.ts` | `src/db/seed.ts`, `src/db/seed-data.ts` |
  | `src/**/*.test.ts` | `tests/*.test.ts` |
