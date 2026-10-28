# Sikora Beauty

Online store for professional skincare — Dr.Spiller, Glymed+, Innoaesthetics, Me line, Dermafirm,
Braderm, Institutum — with a care finder and cosmetologist consultations. Storefront in Ukrainian
(default) and English.

## Status

Planning. Nothing is deployed yet.

- Plan: [`.ai/specs/sikora-beauty/`](.ai/specs/sikora-beauty/) — spec, stack and the
  [roadmap](.ai/specs/sikora-beauty/roadmap.md) by phase.
- Next: Phase 0 — `walking skeleton`.

## Stack

Next.js + Payload CMS 3 on Postgres, one application; next-intl; Tailwind CSS + shadcn/ui; Zod.
Hosted as a Docker image on Hetzner with Coolify, behind Cloudflare. Details:
[`stack.md`](.ai/specs/sikora-beauty/stack.md).

## Development

The repository still holds the WebStorm Vite template until `walking skeleton` replaces it.

```
npm ci
npm run dev
```

Every pull request runs CI (`.github/workflows/ci.yml`): build, `jig knowledge check`, `npm audit`
and gitleaks. Work follows Jig — see [`AGENTS.md`](AGENTS.md).
