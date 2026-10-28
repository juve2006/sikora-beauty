---
id: adr-20261028-development-on-vercel-neon
type: adr
status: superseded
date: 2026-10-28
domains: []
paths: []
summary: Development deploys to Vercel Hobby + Neon behind Vercel Authentication, after CI, until the production host
reviewed_at: 2026-10-28
---
# Until the production host exists, development deploys to Vercel Hobby with Neon, visible only to the developer

Superseded by adr-20261028-vercel-git-deploys (2026-10-28): Vercel's GitHub App deploys every push.

## Context

The production host (adr-20261028-hetzner-coolify-hosting) needs a domain first: without one,
Coolify serves plain HTTP, and the panel password, the deploy token and every login would travel
in the clear. A server also costs money from the first day, while nothing is sold for months. The
developer wants every merge deployed from the start anyway, so the deploy path is not first tried
at launch. Source: task `walking-skeleton`, the developer's decision of 2026-10-28.

## Decision

- Every push to `master` runs CI as a gate (`.github/workflows/deploy.yml` calls `ci.yml`), then
  `vercel deploy --prod`. Vercel's own Git deploys are off (`vercel.json`), so nothing reaches
  Vercel without green CI.
- Vercel runs `npm run vercel-build`: `payload migrate` over Neon's direct connection
  (`DATABASE_URL_UNPOOLED`), then `next build`. A failed migration fails the deploy.
- Database: Neon Free in Frankfurt; functions in `fra1`.
- Vercel Authentication with scope "All Deployments": no request reaches the application without
  the developer's Vercel login. The first admin is created behind it.
- Secrets live in Vercel's environment and GitHub Actions secrets, with a copy in a password
  manager. Setup and teardown: `docs/deploy.md`.
- This ends with the roadmap item `production host`, before the store sells anything.

## Alternatives

- **Hetzner + Coolify from day one** — development equals production, but a domain first, a
  server to run and pay for, and plain HTTP until then.
- **No deploy until launch** — nothing to run, but the deploy path is first tested at launch.
- **Vercel's Git integration** — previews per pull request, but `master` deploys without waiting
  for CI.
- **Vercel Password Protection** — one shared password, but not available on Hobby.

## Consequences

- $0 while developing; HTTPS without a domain.
- Vercel Hobby allows non-commercial use only: the store must move before it sells. If Vercel
  pauses the project earlier, the options are Pro (~$20/month) or moving sooner.
- Only the Vercel account owner gets past the login wall; how the owner and the cosmetologist
  reach the deployment is open (spec `sikora-beauty`, open question 12).
- Serverless differs from the production host: migrations run at build here and on start there
  (`prodMigrations`); the production host item adds the Docker image and its CI job.
