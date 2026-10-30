# Rules and Invariants

Normative requirements for this project. Rules say how work must be done; invariants say
what must always hold. Both are enforced in review and verification. Area-specific rules
are added as sections of this file.

Nothing below is built yet; "checked by" names the check each rule gets once code exists.

## Invariants

- Money is stored and computed as integer kopiyky, never as a float. (spec `sikora-beauty`;
  checked by: Vitest on price calculation, review)
- The server reprices every order from the database; a price sent by the browser is never
  trusted. (spec `sikora-beauty`; checked by: Vitest on checkout)
- An order keeps a snapshot of product names and prices at checkout. (adr-20261028-own-orders-collection;
  checked by: Vitest)
- An order's status only moves forward; a repeated or late event leaves a reached status as it
  is. (adr-20261028-own-orders-collection; checked by: Vitest on status transitions)
- A monobank webhook has no effect before its signature is verified. (adr-20261028-monobank-and-cash-on-delivery;
  checked by: Vitest with a valid and a forged signature)
- Online card payment is offered only when every order line is in stock.
  (adr-20261028-two-step-launch; checked by: Vitest on checkout)
- INCI is never generated; every INCI has a recorded source. (adr-20261028-reviewed-ai-content-drafts;
  checked by: a required source field, review)
- A product is visible on the storefront only after a person with an admin role publishes it; an
  import or an AI draft never publishes by itself, nor before a person marks its texts
  «Перевірено». (adr-20261028-reviewed-ai-content-drafts, refined by adr-20261029-admin-roles and
  adr-20261030-ai-drafts-and-review; checked by: Payload drafts and `access.read` on `products`,
  `requireReview`, Vitest in `tests/content.test.ts`)
- The store always has an owner: nobody changes their own role or deletes themselves.
  (adr-20261029-admin-roles; checked by: Vitest on `src/lib/access.ts`)
- Until the launch every request to the production domain passes the site password; a Production
  build without `SITE_PASSWORD` fails. (adr-20261029-site-password; checked by: Vitest on
  `src/proxy.ts` and `src/lib/env.ts`)
- A consultation request is created only by `requestConsultation`, after the form's Zod schema
  and Turnstile: no role creates one through REST or GraphQL, and no role changes what the shopper
  sent — only its status. Only an admin role reads a request; only the owner deletes one.
  (adr-20261030-consultation-requests; checked by: Vitest in `tests/access.test.ts` and
  `tests/consultation.test.ts`)
- Once the site password is gone, a Production build without the Turnstile keys fails.
  (adr-20261030-consultation-requests; checked by: Vitest on `src/lib/env.ts`)
- Product texts describe cosmetic effects only; no medical claims. (adr-20261028-reviewed-ai-content-drafts;
  checked by: the wording checklist — the status field's description and the words
  `src/lib/claims.ts` flags in the admin — and the person who marks the texts «Перевірено»)
- A published product has a Ukrainian name, whichever locale it was published from.
  (adr-20261028-storefront-languages-uk-en; checked by: the `beforeChange` hook on `products`)

## Rules

- A hook that reads a document in another locale calls the Local API without `req`. Given `req`,
  the Local API sets `req.locale` to the locale it reads, and the save that ran the hook then
  writes into that locale — English texts over the Ukrainian ones. (task `english-content`;
  checked by: review)
- A write that sets a localized field inside an array (`actives[].name`) in one locale carries the
  rows' `id`s. Without them Payload replaces the rows, and the other locale's values in them are
  gone; the admin keeps the ids, a script or an API call must send them. (task `product-page`;
  checked by: review)

- A migration that adds a column with a default to a table that has rows sets the default after
  adding the column, unless every existing row should take that value: Payload generates
  `ADD COLUMN … DEFAULT`, which Postgres writes into every existing row. (task `content-drafts`;
  checked by: review)
- Every input from outside — form, webhook, import row, API response — passes the domain's Zod
  schema before use. (spec `sikora-beauty`; checked by: review)
- The storefront reads Payload's Local API with `overrideAccess: false`. The Local API skips access
  control by default, so without it a page would show drafts. (task `catalog-model`; checked by:
  review)
- Every collection states its own `create`, `update` and `delete` access per role, from
  `src/lib/access.ts`; Payload's default — any logged-in user may do anything — is never relied upon.
  A new collection goes into `src/collections/index.ts`. (adr-20261029-admin-roles; checked by:
  Vitest in `tests/access.test.ts`)
- A custom admin view (`admin.components.views`) is open to anyone: Payload sends a visitor
  without admin access to the login only from its own views. The view redirects when
  `permissions.canAccessAdmin` is false and checks the role itself; its endpoints check the role
  again. (adr-20261029-catalog-import; checked by: review)
- UI strings live in `messages/uk.json` and `messages/en.json`, never inline, and both files keep
  the same keys. (adr-20261028-storefront-languages-uk-en; checked by: a key-parity check in CI)
- Content text fields are localized with `uk` as default and fallback; prices, INCI, SKU and images
  are not localized. (adr-20261028-storefront-languages-uk-en; checked by: review)
- UI is mobile-first: an item is done only when it works at 360 px and on desktop, in both locales.
  (spec `sikora-beauty`; checked by: Playwright at both widths)
- Every UI component appears in `/canvas` in every variant and state. `/canvas` is open locally;
  in production it answers 404 to anyone without a Payload session, and it is `noindex`. Its
  component, variant and size names are code identifiers, not UI strings. (spec `sikora-beauty`,
  task `design-direction`; checked by: review)
- `next build` runs in CI without a database, so no page under `(shop)/` is prerendered: its
  layout reads the menu from Payload while the page renders, and a page's own `connection()` does
  not stop the layout. A page the build would prerender exports
  `dynamic = 'force-dynamic'` (the home page, `/brands`, `/canvas`); a product page and a page by
  slug return `[]` from `generateStaticParams`, so they render on the first visit and stay cached
  until a save revalidates them; a list of the catalog reads `searchParams`. A miss only logs
  `cannot connect to Postgres` and the build still passes, so read the build's log, not its exit
  code. (tasks `design-direction`, `product-page`, `catalog-listing`, `header-home-and-about`,
  adr-20261030-header-menu-and-pages-from-payload; checked by: the CI `build` job's log, review)
- A page's slug never names a section of the store: `RESERVED_SLUGS` (`src/lib/constants`) lists
  every folder under `(shop)/` and the paths the proxy skips, and the page's slug field refuses
  them. A new section joins the list in the same change, or a page saved earlier under its name
  hides it. (task `header-home-and-about`; checked by: `tests/pages.test.ts`)
- No two GraphQL types share a name: a Payload block is named after its slug, so a block whose
  slug is a collection's takes an `interfaceName` (`products` → `ProductsBlock`); a clash breaks
  all of `/api/graphql`, not only the block. (task `header-home-and-about`; checked by:
  `tests/graphql.test.ts`)
- One roadmap item is one task and one pull request, with a Backend and a Frontend section.
  (spec `sikora-beauty`; checked by: review)
- A pull request merges into `master` only with green CI (`.github/workflows/ci.yml`). (spec
  `sikora-beauty`; checked by: the CI status — not enforced by GitHub on a private repository
  without GitHub Pro)
- A shopper's personal data — name, phone, what they wrote — never reaches a log: a failed query
  is logged without its params or the database's detail, which carry the row. (task
  `consultation-request`; checked by: Vitest in `tests/consultation.test.ts`, review)
- Secrets never enter the repository; they live in the host's environment (Vercel during
  development, Coolify in production), in GitHub Actions secrets when a workflow deploys, and in a
  password manager. (adr-20261028-hetzner-coolify-hosting; checked by: gitleaks in CI, review)
- Every merge to `master` is a deploy, so the pull request that changes what the site does also
  updates what the public reads about it: `README.md` (status, what is live, how to run it), the
  docs it touches and, when the summary changes, the repository description. (developer,
  2026-10-28; checked by: review)
- A pull request's description is updated whenever a push changes what the pull request does.
  (developer, 2026-10-28; checked by: review)
- A new check joins `ci.yml` as a job of its own, in the pull request that brings the code it
  checks. (spec `sikora-beauty`; checked by: review)
- CI fails on a high or critical advisory (`npm audit --audit-level=high`). One reached through a
  package that pins the vulnerable version is lifted by an entry in `overrides` in `package.json`:
  `dompurify` (pinned at 3.4.8 by `monaco-editor` in `@payloadcms/ui`) and `graphql-scalars`
  (pinned at 1.22.2 by `@payloadcms/graphql`; GHSA-x8rm-f576-gq67). An entry goes once its
  parent ships the fix. (task `deps-audit`; checked by: `npm audit` in CI, review)
- Dependency install scripts stay denied (`allowScripts` in `package.json`): the packages that
  have them ship prebuilt binaries as platform packages, and npm skips unlisted scripts anyway.
  Approving one needs the reason in its pull request. (task `build-warnings`; checked by: npm's
  `install-scripts` warning in the CI and Vercel logs, review)
- The Node major changes only by a decision: `engines.node` stays below the next major and
  `.nvmrc` names the same one, so Vercel never moves to a new major by itself. (task
  `build-warnings`; checked by: review)
- Durable artifacts — knowledge, ADRs, specs, code comments, commit messages — are written in
  English. (developer, 2026-10-28; checked by: review)
- Commits and pull requests name only the developer as author; no AI co-author lines.
  (developer, 2026-10-28; checked by: review)
