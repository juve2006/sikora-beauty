---
id: adr-20261103-customer-accounts
type: adr
status: accepted
date: 2026-11-03
domains:
  - accounts
  - admin
  - orders
paths:
  - src/collections/customers.ts
  - src/lib/auth-writes.ts
  - src/lib/email.ts
  - src/lib/access.ts
  - src/lib/actions/account.actions.ts
  - src/lib/actions/customer.actions.ts
summary: Shoppers are a Payload collection of their own, a session no longer means staff, email is confirmed by letter and password, and only a marked operation writes the columns that decide who may get in
reviewed_at: 2026-11-04
---
# A shopper's account is a row of its own Payload collection, `customers`, and a session no longer means staff

## Context

The developer asked on 2026-11-02 for registration and sign-in now, ahead of the launch: a shopper
gets their data, their orders and a filled checkout form; someone with an admin role signs in the
same way and gets the admin. Until then every Payload session was staff's, and the code relied on
it: `/canvas`, `products.read`, product versions and Payload's own collections let in anyone with a
session.

Payload also writes an auth row whole, from a snapshot. Sign-in reads the row before the password
check and later adds its session; `refresh`, `logout`, `incrementLoginAttempts`, `forgotPassword`,
`verifyEmail` and every `payload.update` do the same. Two operations on one row overwrite each
other: a sign-in with the old password during a reset brought the old password back while the form
said it was changed.

## Decision

- **Two collections.** `users` stays staff's. `customers` (admin group «Продажі») is Payload auth
  with `verify`, on the same cookie. One form at `/account`: `signIn` tries `users`, then
  `customers`; staff land in `/admin`, a shopper on the home page. An address may be in both:
  refusing it would reveal staff's address, and a shopper's row gives no rights. Asked whether one
  table with roles would do, the developer kept two.
- **A session is not staff.** Every rule in `src/lib/access.ts` asks `user.collection === 'users'`
  first. `products.read`, `products.readVersions`, `/canvas`, `payload-locked-documents` and
  `payload-preferences` ask for staff. A shopper changes their own data only through `updateProfile`.
- **An email is confirmed by the letter and the password together.** Opening the link changes
  nothing; the account's right password on that page confirms it, in one conditional `UPDATE` on the
  id, the token and the hash read before the check. Re-registering an unconfirmed address replaces
  the password and keeps the token, inside a transaction that first holds the row, so the holder of
  the mailbox always wins and someone else's password is never activated.
- **Mail is the store's Gmail over SMTP** until there is a domain: `SMTP_*` variables, so changing
  provider needs no code. A Production build without them fails; elsewhere an adapter sends nothing
  and logs nothing. Letters are ours, with links to `/account/...`, in the account's language; a
  staff member's reset letter still leads to `/admin/reset/<token>`. A letter goes at most once in
  5 minutes per account.
- **An order is tied to an account only at checkout, by the session** (`orders.customer`), never by
  email. Nobody changes that link. A guest checks out as before.
- **`src/lib/auth-writes.ts` guards the columns that decide who may get in**: `hash`, `salt`,
  `sessions`, the login counters and the reset token. It wraps the database adapter's `updateOne`, so
  a whole-row write keeps them as stored unless the operation came to change them, which
  `markAccessWrites` says in `req.context`. A reset writes as it is, a new password holds the row at
  the write and checks the person's own session is still stored, and a session write holds the row
  if the hash is the one read, then merges with the sessions stored by then. The hold is only at the
  write: before Payload's reads it would keep a pool client while those reads ask for a second.
  GraphQL mutations are off on both collections, as a mark lasts a request and GraphQL runs several
  operations in one.
- **The store keeps answering when mail does not.** Payload sends a letter inside its transaction,
  holding a client and the row, so SMTP has timeouts of seconds; reset letters go one at a time per
  process, in `after()`; the pool has `connectionTimeoutMillis`, so a request that cannot get a client
  fails within 10 seconds instead of waiting for good. REST and GraphQL `forgot-password` are closed
  on both collections: letters are asked for through the store's form, behind Turnstile.
- **Google is a task of its own**, `google-sign-in`, with its own gate.

## Alternatives

- **Shoppers in `users` with a `customer` role** — one table, one form, the least code; but `hasRole`
  lets a shopper through at once with neither the compiler nor a test noticing, and public
  registration writes into the owner's table.
- **A session of our own outside Payload** — Payload never sees a shopper, but we own the crypto and
  the revocation, and the admin cannot change shoppers.
- **Confirming on the click** — Chromium's `Critical-CH` restart and mail scanners open a link by
  themselves, and the owner of the address would activate a password someone else registered with.
- **A mail service such as Resend** — better delivery, but it needs a domain the store does not have
  yet.
- **`useSessions: false`** — no session writes at all, but sign-out and a reset would close nothing.
- **Guarding only what Payload marks as a session write** — every other whole-row write passes it.
- **Holding the row before Payload's reads** — the store stopped answering under requests that were
  refused anyway. **`SET LOCAL lock_timeout`** — no long wait is left once the hold is at the write.
- **Comparing `hash` for `update` in `beforeChange`** — a session closed before that moment still
  picks the password.
- **Patching `node_modules`** — it has to be carried over every upgrade.
- **Leaving the race until launch** — a reset would fail exactly when an account is in someone
  else's hands.
- **Turnstile on sign-in** — `/api/customers/login` passes it anyway; the lock after 5 attempts is what
  stops guessing.

## Consequences

- The guard depends on Payload's internals. An upgrade that adds a way to change a password without a
  mark means the password does not change while the form says it did, so a Payload upgrade reads
  `login.js`, `sessions.js` and `update.js` again and runs `tests/e2e/account.spec.ts`, which plays a
  reset against loops of sign-ins, wrong passwords and saves.
- A row without `hash` passes the guard untouched. None exists, and `google-sign-in` makes none: a
  Google account has a random password (adr-20261104-google-sign-in).
- Limits accepted when the developer stopped the review rounds on this cause (2026-11-03), so a new
  race that needs a deliberate flood of requests is listed, not chased:
  - a flood of reset requests postpones real letters with no bound (18.6 s after 3 loops for 15 s);
    Turnstile stands in front on Production, not measured;
  - a live staff session saving its own password in 12 parallel loops during a reset delays the store
    up to 10 s (8 loops are healthy); passwords stay right;
  - a sign-out that read the sessions before a new sign-in can close that one too, and the person
    signs in again;
  - all those numbers come from one local process. The in-memory letter queue and the pool on Vercel
    are learned on Production.
- A refused sign-in sometimes says «try again in a minute» instead of «wrong password»: `instanceof`
  across Payload's copies is unreliable on a production build, so compare by `status` or `name`.
- Sessions have no cap: each sign-in adds a row that lives 30 days.
- Gmail allows about 500 letters a day, and an app password is less than Google recommends. Both go
  with the domain.
- The privacy page must name accounts and Gmail (roadmap item `launch readiness`).
- Rollback: a revert takes the code back, and the migration's `down` deletes shoppers' accounts and
  their link to orders; the orders stay. After launch that loses real people's accounts, so export
  first. Sent letters do not come back.
