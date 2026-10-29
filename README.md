# Sikora Beauty

Online store for professional skincare — Dr.Spiller, Glymed+, Innoaesthetics, Me line, Dermafirm,
Braderm, Institutum — with a care finder and cosmetologist consultations. Storefront in Ukrainian
(default) and English.

## Status

A placeholder page at `/` (Ukrainian) and `/en` (English), and the Payload admin at `/admin`,
where the catalog can be filled in: brands, zones and categories, skin types, conditions and
concerns, products with photos, as drafts and published. A product's English texts can be
filled from its Ukrainian ones with «Перекласти з української» (Chrome on a computer), then
reviewed and published. No storefront page shows the catalog yet. Vercel deploys every push: `master` to Production, every other branch and pull request to a
Preview; both are visible only to the developer. Nothing is sold yet.

- Plan: [`.ai/specs/sikora-beauty/`](.ai/specs/sikora-beauty/) — spec, stack and the
  [roadmap](.ai/specs/sikora-beauty/roadmap.md) by phase.
- Next: Phase 0 — `admin-roles`; Phase 1 — `design-direction`, then the product page and the
  catalog listing.

## Stack

Next.js 16 + Payload CMS 3 on Postgres, one application; next-intl; Zod. During development it
runs on Vercel (Hobby) with Neon Postgres; before launch it moves to Hetzner with Coolify, behind
Cloudflare. Details: [`stack.md`](.ai/specs/sikora-beauty/stack.md).

## Development

Needs Node 24 (`.nvmrc`) and Docker.

```
nvm use
cp .env.example .env          # then set PAYLOAD_SECRET: openssl rand -hex 32
docker compose up -d          # Postgres 17 on 127.0.0.1:5432
npm ci
npm run dev                   # http://localhost:3000, admin at /admin
```

Locally Payload creates the tables itself (`push`). A change to a collection also needs a
migration for the deployed database: `npm run payload -- migrate:create <name>`.

`npm run seed:catalog` (after `npm run dev` has created the tables) adds the zones, categories,
skin vocabularies and brands; it never changes what exists. Uploaded photos go to `./media`
unless `BLOB_READ_WRITE_TOKEN` is set (`.env.example`).

UI strings live in `messages/uk.json` and `messages/en.json`; both keep the same keys.

## Checks and deploy

Every pull request runs CI (`.github/workflows/ci.yml`), one job per check: `typecheck`, `lint`,
`unit`, `build`, `migrations` (on an empty Postgres), `i18n` (same keys in both message files),
`knowledge` (`jig knowledge check`), `audit` (`npm audit`, gitleaks).

Vercel deploys every push through its GitHub App, without waiting for CI: merge only a pull
request whose CI is green. A Production build applies migrations before `next build`; a Preview
uses the same database and never migrates it. Setup and rebuild: [`docs/deploy.md`](docs/deploy.md).

Work follows Jig — see [`AGENTS.md`](AGENTS.md).
