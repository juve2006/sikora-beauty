# Stack — Sikora Beauty

Decided with the developer on 2026-10-28. Conditions from the spec: an admin for non-technical
people, minimal hosting cost, one developer.

One Next.js application with Payload inside it, so frontend and backend share one repository and
one process, separated by folders. Shared by both: Node 24 LTS, TypeScript strict, npm (the
existing lockfile), **Zod** — schemas in `src/<domain>/schema.ts`, shared by form and server
(since 2026-10-30 all in `src/lib/validators.ts`, adr-20261030-code-layout-nextjs-store).

Versions current on 2026-10-28: Next.js 16.4, Payload 3.92 (past the CVE-2026-105850 fix),
next-intl 4.14. Pin exact versions in `walking skeleton`.

## Frontend (storefront, browser)

- **Next.js 16** (App Router) + React; SSR/RSC for SEO.
- **next-intl 4** — UI strings in `messages/uk.json` and `messages/en.json`, locale routing with
  `uk` as the default without a prefix (`/`) and `en` under `/en` (`localePrefix: 'as-needed'`),
  a language switcher, `hreflang` alternates, date and number formatting.
- **Tailwind CSS v4 + shadcn/ui** (Radix primitives) + lucide-react; **mobile-first**, 360 px →
  desktop.
- **`/canvas`** — every component in every variant and state at mobile and desktop widths, in both
  languages (as `CanvasView` in jig-ui); in production only for a signed-in admin, `noindex`.
- Forms — a Zod schema + server actions; a form library when one is needed.
- Cart and favorites — localStorage; images — next/image.
- Analytics — GA4 + Google Ads conversions + Consent Mode v2; anti-spam — Cloudflare Turnstile.

## Backend (data, logic, integrations)

- **Payload CMS 3** (stable 3.x; v4 once stable): admin in Ukrainian (Payload's built-in `uk`
  translation), collections, roles, drafts.
- **Payload localization** — `locales: ['uk', 'en']`, `defaultLocale: 'uk'`, `fallback: true`;
  text fields are `localized: true`; prices, INCI, SKU and images are not.
- **Postgres 17+** through `@payloadcms/db-postgres`; the same major version locally and in
  production; migrations in the repository.
- Server actions and route handlers — checkout, the monobank webhook, cron (payment
  reconciliation, Nova Poshta tracking).
- **Zod** at every boundary: forms, webhooks, price imports, Nova Poshta and monobank responses.
- Media — `@payloadcms/storage-s3` → Cloudflare R2 (public subdomain) + sharp.
- Search — Postgres `pg_trgm` + `unaccent` + a synonyms table, per locale. Rejected: Algolia,
  Meilisearch — a separate service for a few hundred products.
- Integrations:
  - monobank acquiring API — invoice, webhook with an ECDSA signature, status for reconciliation;
    fiscal receipts through Checkbox in the mono merchant cabinet;
  - Nova Poshta API 2.0 — settlements, warehouses, waybills, tracking;
  - Telegram Bot API — orders and requests to a group. Rejected: Viber — business bots are paid.

## Tests and CI (as in jig-ui)

- **Vitest** — logic: prices, status transitions, webhook signature, questionnaire rules, Zod
  schemas.
- **Playwright** smoke at mobile and desktop widths, in both locales: catalog → cart → order.
- `.github/workflows/ci.yml` on `pull_request`, one job per check so a red one
  names itself: `knowledge` (`jig knowledge check`) and `audit` (`npm audit` high and above,
  gitleaks) from the start; `typecheck`, `lint`, `unit`, `build`, `migrations`, `i18n` from the
  walking skeleton; `e2e` from cart and checkout; `docker` from production host; `lighthouse`
  from launch readiness. Actions pinned by SHA, `persist-credentials: false`.
- Development: Vercel's GitHub App deploys every push — `master` to Production, other branches to
  Preview — running `vercel-build` (`vercel.json` `buildCommand`): on Production `payload migrate`
  over Neon's direct connection, then `next build`; Preview only builds, on the same database. CI
  is not a gate before this deploy (adr-20261028-vercel-git-deploys). Production (from
  `production host`): `.github/workflows/deploy.yml` on push to `master`, CI as the gate, Docker
  image build → GHCR → the Coolify API, waiting for the result; the image is built in CI, not on
  the VPS (OOM at 4 GB).
- `.github/dependabot.yml` — npm and GitHub Actions, weekly; Next.js and Payload security patches
  at once.
- Branch protection — not available for a private repository on GitHub Free (open question 10);
  until then, merge only on green CI by discipline. Jig's `node` profile — `jig verify` runs the
  same scripts locally.

## Infrastructure

Development (until `production host`): **Vercel Hobby** (functions in `fra1`, Vercel
Authentication on every URL) + **Neon Free** (Frankfurt, through the Vercel Marketplace). Setup:
`docs/deploy.md`.

Production:

- **Hetzner Cloud** (2 vCPU / 4 GB, EU data centre) + **Coolify** (self-hosted PaaS: deploys,
  TLS, backups).
- A Postgres container on the same server, a daily backup to R2; the restore is tested and
  written down.
- **Cloudflare** — DNS, TLS full strict, caching of static files and media, a WAF exception for
  the monobank webhook, Cloudflare Access in front of `/admin`.
- Sentry (free) — errors; UptimeRobot or Better Stack (free) — uptime.
- Secrets — env in Coolify and a copy in a password manager.

Rejected:
- Vercel Pro + Neon — least operations, but ~$20–40/month; Vercel's free plan forbids commercial
  use.
- Cloudflare Workers + D1 — ~$5/month, but SQLite instead of Postgres, CPU and bundle limits, no
  sharp.
- Railway — ~$5–15/month, weaker backups than a managed Postgres.
- Free tiers (Netlify Free, Oracle Always Free) — sites suspended once credits run out, VMs
  reclaimed.

The choice is reversible: a Docker image and plain Postgres are tied to no host.

## Cost

| What | How much |
|---|---|
| Vercel Hobby + Neon Free, during development | $0 |
| Hetzner VPS, from `production host` | €5.99/month for CX23 if available; CPX22 €19.99 (October 2026) |
| Cloudflare (DNS, CDN, Access), R2 up to 10 GB, Sentry, uptime | $0 within free plans |
| Domain | per registrar, yearly |
| GitHub Pro, if branch protection is wanted | ~$4/month (open question 10) |
| monobank fee, Checkbox subscription, Nova Poshta cash-on-delivery fee | per tariff — to confirm (open questions 4–5) |
