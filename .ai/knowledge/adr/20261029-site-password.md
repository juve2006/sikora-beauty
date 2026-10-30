---
id: adr-20261029-site-password
type: adr
status: accepted
date: 2026-10-29
domains:
  - deploy
paths:
  - src/proxy.ts
  - docs/deploy.md
  - next.config.ts
  - src/lib/env.ts
summary: Until the launch src/proxy.ts closes the production domain with one shared site password (SITE_PASSWORD, Production only); Vercel Standard Protection keeps the Previews
reviewed_at: 2026-10-30
---
# Until the launch the store is closed by one site password of its own; Vercel guards only the Previews

Refines adr-20261028-vercel-git-deploys: its Vercel Authentication scope is Standard Protection now,
not All Deployments.

## Context

In Phase 1 the owner looks at the catalog and the cosmetologist fills it in, each with their own
admin account (adr-20261029-admin-roles), but Vercel Authentication with All Deployments admits
only the Vercel account owner. On Hobby, Vercel's own ways in do not fit two people: Password
Protection is not available, one Shareable Link and one external user per account. Shoppers and
search engines must still not reach the store before the launch. Source: spec `sikora-beauty`,
open question 12; task `deployment-access`, the developer's decision of 2026-10-29.

## Decision

- Vercel Authentication with scope Standard Protection: Previews and deployment URLs stay with the
  Vercel account owner; the production domain is left to the application.
- `src/proxy.ts` asks every request but Next's internals (`/_next`, `/_vercel`) for the site
  password (HTTP Basic, any user name) before next-intl; without it, `401`. Behind it `/admin`
  asks for the person's own Payload account as before.
- `SITE_PASSWORD` lives in Vercel's Production environment only, Sensitive, and in the password
  manager; without it there is no gate (locally, on a Preview). `src/env.ts` fails a Production
  build (`VERCEL_ENV=production`) without it, and refuses one shorter than 12 characters: nothing
  limits the attempts.
- It moves to the production host with the application and is removed in `launch readiness`,
  when the store opens to shoppers.

## Alternatives

- **A Shareable Link** — no code, but one per Hobby account, documented for Preview deployments,
  unknown whether it survives a new Production deployment, and anyone a link is forwarded to gets
  in; it does not move to the production host.
- **Vercel access requests or invitations** — one external user per Hobby account, and each person
  needs a Vercel account.
- **Vercel Pro** with Password Protection or project Viewers — $20–40 a month from the first day;
  development runs at $0.
- **The production host before Phase 1** — a domain and a server paid from the first day.
- **Standard Protection with no password** (`noindex` and Payload's login only) — the unfinished
  storefront open to anyone with the address.

## Consequences

- The owner and the cosmetologist need the address and one shared password; the browser asks for
  it once per session. Changing it: a new `SITE_PASSWORD`, then redeploy Production.
- A broken gate exposes the storefront and the public reads of the API, never the admin, which
  keeps its own login and roles. Going back is one setting: All Deployments.
- An Instant Rollback or Promote to a Production deployment built before the gate serves the
  production domain to anyone: switch back to All Deployments first.
- `/admin` and `/api` now pass through `src/proxy.ts`; next-intl still skips them. Next buffers
  the body of every request the proxy sees and cuts it at 10 MB: `next.config.ts` raises that to
  50 MB for photos uploaded through the server (locally, on the production host).
- `/api/media`, which adr-20261028-media-on-vercel-blob has Vercel Authentication hide until the
  launch, is behind the site password instead.
- `next/image` cannot optimise a local image behind the gate: its own request for the source
  carries no password. A page shows photos by their public Blob URL, or the gate lets
  `/api/media/file/` through — `media` is readable by anyone anyway.
- A webhook or a cron that calls the production domain before the launch needs its own way past
  the gate.
