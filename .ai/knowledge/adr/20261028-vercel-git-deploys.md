---
id: adr-20261028-vercel-git-deploys
type: adr
status: accepted
date: 2026-10-28
domains: []
paths:
  - vercel.json
  - docs/deploy.md
  - package.json
  - src/payload.config.ts
summary: Vercel's GitHub App deploys every push (master → Production, else Preview) on Hobby + Neon; Preview shares the database, only Production migrates
reviewed_at: 2026-10-28
---
# Until the production host exists, Vercel's GitHub App deploys every push to Vercel Hobby with Neon, visible only to the developer

Supersedes adr-20261028-development-on-vercel-neon, which deployed from a GitHub Actions workflow
after CI.

## Context

The production host (adr-20261028-hetzner-coolify-hosting) needs a domain and costs money from
the first day, so development runs on Vercel Hobby with Neon until the roadmap item
`production host`. At first a GitHub Actions workflow deployed `master` after CI, with Vercel's
own Git deploys off. The developer asked for the flow of their other project instead: Vercel
deploys every push itself, `master` to Production and every other branch to a Preview, and
reports both to GitHub. Source: task `deploy-visibility`, the developer's decision of 2026-10-28.

## Decision

- The Vercel project is connected to the repository through the Vercel GitHub App; production
  branch `master`. Every push deploys: `master` → Production, any other branch or pull request →
  Preview.
- `vercel.json` pins `buildCommand: npm run vercel-build`. On Production it runs `payload migrate`
  over Neon's direct connection (`DATABASE_URL_UNPOOLED`), then `next build`; on Preview it only
  builds. A failed migration fails the Production deploy.
- Preview uses the same Neon database as Production and never changes its schema; each
  environment has its own `PAYLOAD_SECRET`.
- CI runs on every pull request and is not a gate before the deploy: only a pull request with
  green CI is merged (a rule — GitHub Free does not enforce it on a private repository).
- Vercel Authentication with scope "All Deployments": no request reaches Production or a Preview
  without the developer's Vercel login.
- Neon Free in Frankfurt, functions in `fra1`. Secrets live in Vercel's environment with a copy in
  a password manager; no deploy secret lives in GitHub. Setup and teardown: `docs/deploy.md`.
- This ends with the roadmap item `production host`, before the store sells anything.

## Alternatives

- **Deploy from GitHub Actions after CI** (the superseded decision) — CI is a gate, but no
  Preview per pull request, and a Vercel token lives in GitHub.
- **A Neon branch per Preview** — Previews with their own data and migrations, but 10 branches
  per project on the Free plan, Previews kept about 6 months, cleanup through the Neon API, and
  it was not confirmed that the branch's direct connection reaches the build.
- **Preview without a database** — no risk to data, but `/admin` and every page that reads data
  fail on a Preview.
- **Vercel Deployment Checks on CI** — hold only the production domain; the build and its
  migrations run before the checks finish.

## Consequences

- A merged pull request deploys at once, whether CI passed or not; its migrations run in that
  build.
- A Preview reads and writes Production's data. A pull request that adds a migration breaks its
  own Preview on the pages that use the new fields until it is merged.
- The repository page lists Production and Preview deployments, created by `vercel[bot]`.
- $0 while developing. Vercel Hobby allows non-commercial use only: the store moves before it
  sells; the production host revisits Previews and the gate.
