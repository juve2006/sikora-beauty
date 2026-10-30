# Architecture — Sikora Beauty

Intended — not built yet. Decided with the developer on 2026-10-28.

## Chosen: domain modules in one Next.js application

One Next.js application with Payload CMS inside it: the storefront, the admin, the API and the
integrations live in one repository, one process and one Docker image. Frontend and backend are
separated by folders, not by services.

The domain folders below were the plan; adr-20261030-code-layout-nextjs-store replaced them on
2026-10-30. A domain is files, not a folder: its collection in `src/collections/`, its reads in
`src/lib/actions/<x>.actions.ts`, its integration in `src/lib/<x>.ts`, its schemas in
`src/lib/validators.ts`.

```
src/app/[locale]/(shop)/…   storefront (SSR/RSC), `uk` at `/`, `en` at `/en` — frontend
src/app/[locale]/(shop)/canvas/  every component in every variant and state, mobile + desktop
src/app/(payload)/admin/    Payload admin
src/components/             UI components (shadcn/ui)
src/i18n/                   next-intl routing and request config
messages/uk.json, en.json   UI strings
src/catalog/                brands, zones and categories, skin vocabularies, products, filters
src/search/                 search (pg_trgm + synonyms)
src/orders/                 cart (repriced on the server), checkout, orders, statuses
src/payments/mono.ts        invoice, webhook, reconciliation (launch step 2)
src/delivery/novaposhta.ts  settlements, warehouses, waybills, tracking
src/consultation/           consultation requests
src/finder/                 the "pick my care" questionnaire and its rules
src/notify/telegram.ts      notifications
src/<domain>/schema.ts      Zod schemas for the domain's boundary — shared by form and server
```

- **Frontend** — `src/app/[locale]/(shop)`, `src/components`, `src/i18n`, `messages/`.
- **Backend** — Payload collections, server actions, route handlers and the integration modules
  in `src/<domain>/`.

## Rules

- Domains depend on `catalog`, not on each other's internals.
- Each external integration (monobank, Nova Poshta, Telegram) is one module with no port
  interface: there is one implementation; an abstraction comes with the second one.
- Every input from outside (form, webhook, import row, API response) passes the domain's Zod
  schema.
- Money is integer kopiyky, never a float.
- An order's status only moves forward; a repeated event does not change a state already reached.
- An order keeps a snapshot of names and prices at checkout.
- Price and availability reach the storefront through on-demand revalidation from a Payload hook.
- UI strings live in `messages/`, never inline; content texts are localized Payload fields with
  `uk` as the default and fallback locale; locale-neutral data (prices, INCI, SKU, images) is not
  localized.

## Rejected

- **Controllers / services / repositories layers** — spread one feature over three folders; the
  size where layers pay off is not here.
- **Ports and adapters everywhere** — an interface with one implementation per integration.
- **A separate backend service** (Medusa or an own API) — a second deployment, a second database
  or a network seam with no need.
