---
id: adr-20261030-consultation-requests
type: adr
status: accepted
date: 2026-10-30
domains:
  - consultation
  - notify
paths:
  - src/collections/consultation-requests.ts
  - src/lib/actions/consultation.actions.ts
  - src/lib/telegram.ts
  - src/lib/turnstile.ts
  - "src/components/shared/consultation/**"
  - src/lib/env.ts
summary: A consultation request is created only by the server action requestConsultation (Zod, then Turnstile, then the Local API); the collection closes create and the shopper's fields to every role; Telegram is told after the answer
reviewed_at: 2026-10-30
---
# A consultation request is created only by a server action behind Zod and Turnstile, and reaches Telegram after the answer

## Context

A shopper who does not know which professional product suits them asks the cosmetologist. The
spec chose the shape: a form, a record in Payload with a status, a message to the owner's Telegram
group, Cloudflare Turnstile against bots. The form is public, needs no account, and carries
personal data — a name and a phone. Source: spec `sikora-beauty`, open question 6; task
`consultation-request`, the developer's decisions at its gate of 2026-10-30.

## Decision

- `consultation-requests` closes `create` to everyone (`nobody`), REST and GraphQL included. The
  only way in is the server action `requestConsultation`: the form's schema `consultationRequest`
  (the form checks the same one before it spends a Turnstile token), then Turnstile, then
  `payload.create` through the Local API.
- What the shopper sent — name, phone, message, product, locale — no role changes (field
  `access.update: nobody`); the cosmetologist changes only the status («Новий», «В роботі»,
  «Закритий»). Only an admin role reads a request; only the owner deletes one, when its author asks.
- A phone is a Ukrainian number, kept as `+380XXXXXXXXX`, so it is dialled from Telegram with a tap.
- The product a request came from is looked up among published products with
  `overrideAccess: false`; one that is not there (deleted, a draft, forged) is dropped and the
  request kept.
- Turnstile is optional while the site password closes the store: `src/lib/env.ts` fails a
  Production (`VERCEL_ENV=production`) with no `SITE_PASSWORD` and no Turnstile keys, so the check
  arrives with `launch readiness` without anyone remembering it. The widget is invisible unless
  Cloudflare needs the shopper; a form sent before its token arrives waits for it, up to 30 s.
- Telegram is told in `after()`, once the shopper has the answer: a request Telegram does not get
  waits in the admin, and the shopper is told it was sent. Plain text, no `parse_mode`, so nothing a
  shopper types can break it. Without `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` nothing is sent.
- A send that never reaches the server — offline, or an action a new deploy replaced — is the
  form's «Не вдалося надіслати», with what the shopper typed kept, never an error page.

## Alternatives

- **`create` open to anyone, Turnstile in a `beforeChange` hook** — one path for the API and the
  form, but a public REST endpoint for personal data, and a mistake in the hook opens writing to
  everyone.
- **A Payload endpoint, as the import and the AI drafts have** — the form would build its fetch and
  JSON by hand; a server action gives `useActionState` and the pending state.
- **Telegram awaited before the answer** — a slow Telegram holds the shopper, and its failure tempts
  a «failed» for a request that is stored. **An `afterChange` hook** — fires on every status
  change and from scripts and tests.
- **Turnstile required on Production now** — the merge waits for a Cloudflare account, and behind
  the site password there is no spam to stop. **A honeypot and rate limiting** — bots pass a
  honeypot, and rate limiting on serverless needs a store.
- **`@marsidev/react-turnstile`** — a dependency for one widget.
- **A `/consultation` page instead of a dialog** — the shopper leaves the product, and the owner
  asked for a window.
- **Any phone number (E.164)** — typos and rubbish pass; shoppers are in Ukraine (Nova Poshta).
- At the gate: **a contact-channel field** («+ спосіб зв'язку»), **the button on the product page
  only, or in the header only**, **a promise of an answer «протягом робочого дня»**.

## Consequences

- Telegram's failures show only in the host's log (`Telegram:`); the request waits in the admin as
  «Новий» either way.
- A failed save logs only what went wrong, never the query's params or the failing row.
- The bot, the group and the Turnstile keys are set by hand in Vercel (`docs/deploy.md`).
- No retention period: the owner deletes a request when asked. The privacy page comes with
  `launch readiness`; until then a line under the form says what is kept and why.
- Undoing it: a revert, and the migration's `down` drops the table with the requests in it; the
  messages already in Telegram stay there.
