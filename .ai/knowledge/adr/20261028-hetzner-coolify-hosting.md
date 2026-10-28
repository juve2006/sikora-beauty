---
id: adr-20261028-hetzner-coolify-hosting
type: adr
status: accepted
date: 2026-10-28
domains: []
paths:
  - Dockerfile
  - "docker-compose*.yml"
  - ".github/workflows/**"
summary: Docker image on a Hetzner VPS with Coolify, Postgres backed up to R2, Cloudflare in front
---
# The store runs as a Docker image on a Hetzner VPS managed by Coolify, behind Cloudflare

## Context

Hosting cost should be minimal, and the store must not be suspended or lose its server while
orders come in. One developer maintains it. Source: spec `sikora-beauty`.

## Decision

- A Hetzner Cloud VPS (2 vCPU / 4 GB, EU) with Coolify (self-hosted PaaS: deploys, TLS, backups).
- Postgres in a container on the same server, backed up daily to Cloudflare R2, with a restore
  that has been tested and written down.
- Media in Cloudflare R2; Cloudflare DNS, TLS full strict and caching in front; Cloudflare Access
  in front of `/admin`.
- The image is built in GitHub Actions after the CI gate and pushed to GHCR; Coolify only pulls
  and runs it.

## Alternatives

- **Vercel Pro + Neon** — least operations, but ~$20–40/month; Vercel's free plan forbids
  commercial use.
- **Cloudflare Workers + D1** — ~$5/month, but SQLite instead of Postgres, CPU and bundle limits,
  no sharp.
- **Railway** — ~$5–15/month, weaker backups than a managed Postgres.
- **Free tiers (Netlify Free, Oracle Always Free)** — a site is suspended once credits run out; an
  idle VM can be reclaimed.

## Consequences

- ~€4–6/month for the server; Cloudflare and R2 stay within free plans at this size.
- OS updates, Coolify updates and restore drills are the developer's.
- Reversible: the image and plain Postgres are tied to no host.
