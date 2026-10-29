---
id: convention-next-version-docs
type: convention
status: active
domains: []
paths:
  - "src/app/**"
  - src/proxy.ts
  - next.config.ts
summary: Read node_modules/next/dist/docs/ for the installed Next.js before writing code in src/app, proxy.ts or next.config.ts; replaces agentRules and third-party Next skills
reviewed_at: 2026-10-29
---
# Next.js code is written from the docs of the installed version

## Practice

Before writing or changing code that uses a Next.js API — in `src/app/**`, `src/proxy.ts`,
`next.config.ts` — read its section in `node_modules/next/dist/docs/`, which Next ships for the
installed version.

## Example

`src/app/[locale]/(shop)/canvas/page.tsx` awaits `headers()` before `getPayload`:
`01-app/03-api-reference/04-functions/headers.md` says `headers()` is a request-time API that opts
the route into dynamic rendering, so `next build` never reaches for a database it does not have.

## Rationale

The APIs this project leans on (`proxy.ts`, `next/root-params`, async `headers()` and `cookies()`)
changed between majors, and what a model remembers is often an older version.

- Next's own block for `AGENTS.md` (`agentRules` in `next.config.ts`) says the same, and the
  project turns it off: `AGENTS.md` is written by people and by Jig. This convention replaces it.
- Rejected: a third-party "Next.js best practices" skill. `vercel-labs/next-skills` is archived and
  its skills moved into `vercel/next.js` for single scenarios (cache components, upgrades);
  `vercel-labs/agent-skills` is a general React performance checklist with no problem here to
  solve. Revisit when a measured slowness gives it one. (task `design-direction`)
