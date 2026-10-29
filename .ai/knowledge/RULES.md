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
- A product is visible on the storefront only after the cosmetologist publishes it.
  (adr-20261028-reviewed-ai-content-drafts; checked by: Payload drafts and `access.read` on
  `products`)
- Product texts describe cosmetic effects only; no medical claims. (adr-20261028-reviewed-ai-content-drafts;
  checked by: the content checklist, review)
- A published product has a Ukrainian name, whichever locale it was published from.
  (adr-20261028-storefront-languages-uk-en; checked by: the `beforeChange` hook on `products`)

## Rules

- A hook that reads a document in another locale calls the Local API without `req`. Given `req`,
  the Local API sets `req.locale` to the locale it reads, and the save that ran the hook then
  writes into that locale — English texts over the Ukrainian ones. (task `english-content`;
  checked by: review)

- Every input from outside — form, webhook, import row, API response — passes the domain's Zod
  schema before use. (spec `sikora-beauty`; checked by: review)
- The storefront reads Payload's Local API with `overrideAccess: false`. The Local API skips access
  control by default, so without it a page would show drafts. (task `catalog-model`; checked by:
  review)
- UI strings live in `messages/uk.json` and `messages/en.json`, never inline, and both files keep
  the same keys. (adr-20261028-storefront-languages-uk-en; checked by: a key-parity check in CI)
- Content text fields are localized with `uk` as default and fallback; prices, INCI, SKU and images
  are not localized. (adr-20261028-storefront-languages-uk-en; checked by: review)
- UI is mobile-first: an item is done only when it works at 360 px and on desktop, in both locales.
  (spec `sikora-beauty`; checked by: Playwright at both widths)
- Every UI component appears in `/canvas` in every variant and state. (spec `sikora-beauty`;
  checked by: review)
- One roadmap item is one task and one pull request, with a Backend and a Frontend section.
  (spec `sikora-beauty`; checked by: review)
- A pull request merges into `master` only with green CI (`.github/workflows/ci.yml`). (spec
  `sikora-beauty`; checked by: the CI status — not enforced by GitHub on a private repository
  without GitHub Pro)
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
