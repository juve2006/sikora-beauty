# Rules and Invariants

Normative requirements for this project. Rules say how work must be done; invariants say
what must always hold. Both are enforced in review and verification. Area-specific rules
are added as sections of this file.

Nothing below is built yet; "checked by" names the check each rule gets once code exists.

## Invariants

- Money is stored and computed as integer kopiyky, never as a float. (spec `sikora-beauty`;
  checked by: Vitest on price calculation, review)
- The server reprices every order from the database; a price sent by the browser is never
  trusted; the total the browser showed is only compared, and a different one answers `changed`.
  (spec `sikora-beauty`, adr-20261101-cart-and-checkout; checked by: Vitest in
  `tests/orders.test.ts`, the e2e test's order read back from the database)
- An order keeps a snapshot of product names and prices at checkout. (adr-20261028-own-orders-collection;
  checked by: Vitest in `tests/orders.test.ts`)
- An order's status only moves forward; a repeated or late event leaves a reached status as it
  is. (adr-20261028-own-orders-collection; checked by: `canMoveStatus` in the `beforeChange` hook
  on `orders`, Vitest in `tests/orders.test.ts`)
- An order's payment status moves apart from its status and only by one table: `awaiting` →
  `paid` or `failed`, `failed` → `paid`, `paid` → `refunded`; a mistaken mark is told in the
  manager's note, never taken back. A card's is changed only by monobank's webhook, the owner's
  never. (adr-20261106-transfer-to-the-store-account, adr-20261106-card-payment-on-monobanks-page;
  checked by: `canMovePayment` and `context.paymentProvider` in the `beforeChange` hook
  `keepPaymentForward`, Vitest in `tests/orders.test.ts`)
- An order is created only by `placeOrder`, after the form's Zod schema, Turnstile and repricing:
  no role creates one through REST or GraphQL, and no role changes what the shopper sent or the
  snapshot — only the status, the payment status and the manager's note. An admin role reads every
  order, and a shopper only their own, without the manager's note; nobody reads its return token,
  which only the thank-you page looks an order up by; nobody changes its monobank invoice, which
  only staff read; only the owner deletes one.
  (adr-20261101-cart-and-checkout, adr-20261103-customer-accounts,
  adr-20261106-transfer-to-the-store-account, adr-20261106-card-payment-on-monobanks-page; checked
  by: Vitest in `tests/access.test.ts` and `tests/orders.test.ts`)
- The store's payment details are read by anyone and changed only by the owner: an account taken
  over must not redirect the money. (adr-20261106-transfer-to-the-store-account; checked by: Vitest
  in `tests/access.test.ts`)
- A monobank webhook has no effect before its signature is verified: nothing is read before it
  holds. (adr-20261028-monobank-and-cash-on-delivery, adr-20261106-card-payment-on-monobanks-page;
  checked by: Vitest in `tests/monobank.test.ts` with a valid and a forged signature, the e2e tests
  through `tests/e2e/mono-stub.mjs`)
- Paying ahead — a transfer to the store's account, and online card payment — is offered only when
  every order line is in stock, and `placeOrder` refuses it otherwise. (adr-20261028-two-step-launch,
  adr-20261106-transfer-to-the-store-account, adr-20261106-card-payment-on-monobanks-page; checked
  by: Vitest on `canPrepay` and `placeOrder` in `tests/orders.test.ts`, the e2e test with a
  made-to-order line)
- INCI is never generated; every INCI has a recorded source. (adr-20261028-reviewed-ai-content-drafts;
  checked by: a required source field, review)
- A product is visible on the storefront only after a person with an admin role publishes it; an
  import or an AI draft never publishes by itself, nor before a person marks its texts
  «Перевірено». (adr-20261028-reviewed-ai-content-drafts, refined by adr-20261029-admin-roles and
  adr-20261030-ai-drafts-and-review; checked by: Payload drafts and `access.read` on `products`,
  `requireReview`, Vitest in `tests/content.test.ts`)
- The store always has an owner: nobody changes their own role or deletes themselves.
  (adr-20261029-admin-roles; checked by: Vitest on `src/lib/access.ts`)
- Until the launch every request to the production domain passes the site password, but
  `POST /api/mono/webhook`, which its signature authenticates; a Production build without
  `SITE_PASSWORD` fails. (adr-20261029-site-password, adr-20261106-card-payment-on-monobanks-page;
  checked by: Vitest on `src/proxy.ts` and `src/lib/env.ts`)
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
- A session is not staff: a shopper never passes `hasRole`, and no code draws a conclusion from
  `req.user` alone. (adr-20261103-customer-accounts; checked by: Vitest in `tests/access.test.ts`,
  with a shopper who has staff's id, and `tests/e2e/account.spec.ts`)
- An email is confirmed only by the account's password on the letter's page; opening the link
  changes nothing. The one exception is an account Google creates, on the address Google has just
  said is verified. (adr-20261103-customer-accounts, adr-20261104-google-sign-in; checked by:
  `tests/account.test.ts`, `tests/e2e/account.spec.ts`)
- Google's word opens an account somebody already has only where Google hosts the address
  (`@gmail.com` or `hd`). An account it signed in before is found by `googleId`, never by the
  address, and Google gives only a `customers` session, whoever holds the address among staff.
  (adr-20261104-google-sign-in; checked by: `tests/google.test.ts`, `tests/e2e/account.spec.ts`)
- An order is tied to an account only at checkout, by the session, never by email.
  (adr-20261103-customer-accounts; checked by: Vitest in `tests/orders.test.ts`)
- A phone number is at most one account's, written as `+380…`, and only a confirmed account keeps it:
  an unconfirmed one gives it up to whoever registers or saves it. Nobody proves a number, so it finds
  an account and never shows who someone is. (adr-20261103-phone-sign-in; checked by: the index
  `customers_phone_idx`, `tests/account.test.ts`, `tests/e2e/account.spec.ts`)
- Sign-in by number and a new number in the profile pass Turnstile before anything is looked up, as
  numbers can be walked. Sign-in by number asks only `customers`, never `users`: a stranger's attempts
  at a number never lock staff, and staff's password opens nothing by number.
  (adr-20261103-phone-sign-in; checked by: `tests/account.test.ts`)

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
- A migration's `down()` drops no foreign key after the `DROP TABLE … CASCADE` that already
  removed it: Payload generates `DROP CONSTRAINT` for the `payload_locked_documents_rels` keys
  after the cascade, and the rollback fails on «constraint does not exist». Those lines are
  deleted. (tasks `consultation-request`, `search`; checked by: review)
- A Payload array whose `minRows` must hold is `required` too: Payload checks the row count only
  of a required array, so an empty one passes `minRows` and saves. (task `care-finder`; checked by:
  review)
- Every input from outside — form, webhook, import row, API response — passes the domain's Zod
  schema before use. (spec `sikora-beauty`; checked by: review)
- The storefront reads Payload's Local API with `overrideAccess: false`. The Local API skips access
  control by default, so without it a page would show drafts. Two reads skip it, explicitly, both
  by an order's return token: `getPlacedOrder`, the thank-you page's, which selects the order's
  number, sum, payment, statuses and whether it has a monobank invoice, and nothing a shopper typed;
  and `payByCard`, which selects the sum, the lines, the payment, its status, the invoice and the
  language to make mono's invoice. (task `catalog-model`,
  adr-20261106-transfer-to-the-store-account, adr-20261106-card-payment-on-monobanks-page; checked
  by: review, Vitest in `tests/payment-details.test.ts` and `tests/monobank.test.ts`)
- Every collection states its own `create`, `update` and `delete` access per role, from
  `src/lib/access.ts`; Payload's default — any logged-in user may do anything — is never relied upon.
  A new collection goes into `src/collections/index.ts`. (adr-20261029-admin-roles; checked by:
  Vitest in `tests/access.test.ts`)
- A custom admin view (`admin.components.views`) is open to anyone: Payload sends a visitor
  without admin access to the login only from its own views. The view redirects when
  `permissions.canAccessAdmin` is false and checks the role itself; its endpoints check the role
  again. (adr-20261029-catalog-import; checked by: review)
- Every collection with `versions` declares `readVersions`: Payload's default lets any session read
  them, drafts included, and a shopper has a session. (adr-20261103-customer-accounts; checked by:
  Vitest in `tests/access.test.ts`)
- Payload's own collections (`payload-locked-documents`, `payload-preferences`) are closed in the
  config itself, not in `onInit`: `onInit` changes only the copy of the config that woke the process,
  and GraphQL builds its schema from another. (adr-20261103-customer-accounts; checked by:
  `tests/access.test.ts`, `tests/e2e/account.spec.ts`)
- A GET has no side effect on an account: Chromium's `Critical-CH` restart and mail scanners open a
  link by themselves. The one exception is Google's callback, which does nothing without the state
  cookie its own browser got on leaving for Google, and whose code works once.
  (adr-20261103-customer-accounts, adr-20261104-google-sign-in; checked by:
  `tests/e2e/account.spec.ts`)
- On `users` and `customers` Payload writes a row whole, from a snapshot, so reading and then writing
  is not atomic. A write to one column there is one `payload.db.updateOne` with `atomic: true`, and an
  operation that changes a password or sessions carries a mark in `markAccessWrites`, or
  `src/lib/auth-writes.ts` drops the change. A hold on a row goes in the write, never before Payload's
  reads, which ask the pool for a second client. GraphQL mutations stay off on both, as `req.context`
  is shared by the mutations of one request. (adr-20261103-customer-accounts; checked by:
  `tests/auth-writes.test.ts`, `tests/e2e/account.spec.ts`)
- Nothing inside a Payload transaction waits on an outside service without a timeout: it holds a pool
  client and the row. Payload sends its auth letters inside one, so SMTP has timeouts of seconds.
  (adr-20261103-customer-accounts; checked by: `tests/account.test.ts`)
- UI strings live in `messages/uk.json` and `messages/en.json`, never inline, and both files keep
  the same keys. (adr-20261028-storefront-languages-uk-en; checked by: a key-parity check in CI)
- Content text fields are localized with `uk` as default and fallback; prices, INCI, SKU and images
  are not localized. (adr-20261028-storefront-languages-uk-en; checked by: review)
- UI is mobile-first: an item is done only when it works at 360 px and on desktop, in both locales.
  (spec `sikora-beauty`; checked by: Playwright at both widths)
- A date with its time reads `03.11.2026 20:50` everywhere and in every language: `formatDateTime`
  on the storefront, at Kyiv's time, and `admin.dateFormat` in the admin, at the browser's.
  (developer, 2026-11-03; checked by: `tests/catalog.test.ts`, `tests/e2e/account.spec.ts`)
- Every UI component appears in `/canvas` in every variant and state. `/canvas` is open locally;
  in production it answers 404 to anyone but staff, and it is `noindex`. Its
  component, variant and size names are code identifiers, not UI strings. (spec `sikora-beauty`,
  task `design-direction`; checked by: review)
- `next build` runs in CI without a database, so no page under `(shop)/` is prerendered: its
  layout reads the menu from Payload while the page renders, and a page's own `connection()` does
  not stop the layout. A page the build would prerender exports
  `dynamic = 'force-dynamic'` (the home page, `/brands`, `/canvas`, `/search`, `/favorites`,
  `/cart`, `/cart/thanks`, `/care-finder` — reading
  `searchParams` stops the page, not the layout); a product page and a page by slug return `[]`
  from `generateStaticParams`, so they render on the first visit and stay cached until a save
  revalidates them; a list of the catalog is a `[slug]` route without `generateStaticParams`, so
  the build has none to render. A miss only logs `cannot connect to Postgres` and the build still
  passes, so read the build's log, not its exit code. (tasks `design-direction`, `product-page`,
  `catalog-listing`, `header-home-and-about`, `search`, `favorites`, `cart-and-checkout`,
  `care-finder`, adr-20261030-header-menu-and-pages-from-payload; checked by: the CI `build` job's
  log, review)
- A page's slug never names a section of the store: `RESERVED_SLUGS` (`src/lib/constants`) lists
  every folder under `(shop)/` and the paths the proxy skips, and the page's slug field refuses
  them. A new section joins the list in the same change, or a page saved earlier under its name
  hides it. (task `header-home-and-about`; checked by: `tests/pages.test.ts`, `tests/proxy.test.ts`)
- No two GraphQL types share a name: a Payload block is named after its slug, so a block whose
  slug is a collection's takes an `interfaceName` (`products` → `ProductsBlock`); a clash breaks
  all of `/api/graphql`, not only the block. (task `header-home-and-about`; checked by:
  `tests/graphql.test.ts`)
- One roadmap item is one task and one pull request, with a Backend and a Frontend section.
  (spec `sikora-beauty`; checked by: review)
- A pull request merges into `master` only with green CI (`.github/workflows/ci.yml`, and
  `accounts.yml` when it runs). (spec
  `sikora-beauty`; checked by: the CI status — not enforced by GitHub on a private repository
  without GitHub Pro)
- A shopper's personal data — name, phone, address, what they wrote — never reaches a log: a
  failed query is logged without its params or the database's detail, which carry the row. Payload's
  logger and Next's `console.error` print an error whole, so `src/lib/server-log.ts` leaves them its
  first line, the database's code and its frames. (tasks `consultation-request`, `cart-and-checkout`,
  `server-logs-params`; checked by: Vitest in `tests/consultation.test.ts`, `tests/orders.test.ts`
  and `tests/server-log.test.ts`, review)
- What leaves for Sentry is a list, not what is taken out of everything else: `keepWhatFailed`
  (`src/lib/sentry.ts`) keeps what failed and where, and nothing that passes no `beforeSend` is sent:
  no breadcrumbs, sessions, tracing or replay. Every server `console.error` but Node's own warnings becomes an event, which is
  one more reason for the rule above. (adr-20261105-errors-in-sentry; checked by:
  `tests/sentry.test.ts`, review)
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
  checks. (spec `sikora-beauty`; checked by: review) The exception is `tests/e2e/account.spec.ts`,
  two thirds of e2e's tests: it runs in `accounts.yml`, on a pull request only when `paths` names
  what changed, the accounts' own code and the lockfile, and a new file of the accounts joins them.
  The header, the schema, the orders, `payload.config`, `constants` and `validators` stay out by the
  developer's choice: the header and the schema alone would start the run on about half of pull
  requests, which take 16 minutes with it and 5 without (measured on #61). Every push to `master` runs all of
  e2e there, so a break outside `paths` shows after the merge, with its deploy already going:
  accepted behind the site password, to weigh again at the launch. (developer, 2026-11-04; checked
  by: review)
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
