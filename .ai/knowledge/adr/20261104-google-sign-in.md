---
id: adr-20261104-google-sign-in
type: adr
status: accepted
date: 2026-11-04
domains:
  - accounts
  - storefront
paths:
  - src/lib/google.ts
  - src/collections/customer-endpoints.ts
  - src/collections/customers.ts
  - src/components/shared/account/other-ways.tsx
  - tests/e2e/google-stub.mjs
reviewed_at: 2026-11-04
summary: "A shopper's sign-in with Google: a code flow of our own, who gets which account, the one GET with a side effect, and what stays unconfirmed until Production"
---
# A shopper signs in with Google by a code flow of our own, and Google's word opens an existing account only where Google hosts the address

## Context

The developer asked for two ways into a shopper's account: email and password first, then Google
(2026-11-02). adr-20261103-customer-accounts built the first and left the button inert; staff sign
in only with a password.

What shaped the decision:

- Payload writes an auth row whole from a snapshot, and `src/lib/auth-writes.ts` holds such a write
  back unless the operation is marked. Anything that opens a session has to go through it.
- Google's documents, read 2026-11-04: a token taken from the token endpoint directly needs no
  signature check, but `iss`, `aud` and `exp` do. An account is identified by `sub`, not by `email`.
  `given_name` and `family_name` are not guaranteed. Google is authoritative for an address only
  when it ends in `@gmail.com`, or when `email_verified` comes with `hd`; for any other address,
  "ownership of the third party email account may have since changed".
- A mistake here hands a stranger somebody's account with their orders, and the person it hurt is
  the one who finds it.

Sources: developers.google.com/identity/openid-connect/openid-connect,
/identity/gsi/web/guides/verify-google-id-token, /identity/protocols/oauth2/web-server;
support.google.com/cloud/answer/15549945; publicsuffix.org/list/public_suffix_list.dat.

## Decision

**The flow.** Two endpoints on `customers`, in `src/collections/customer-endpoints.ts`, with
`src/lib/google.ts` speaking to Google by `fetch`.

- `GET /api/customers/google?from=<path>` sets the cookie `google-sign-in` (HttpOnly, SameSite=Lax,
  10 minutes) holding the state, the PKCE verifier and the way back, and redirects to Google with
  `openid email profile`.
- `GET /api/customers/google/callback` compares the state with the cookie before anything else,
  exchanges the code directly with Google in 10 seconds at most and outside any transaction, and
  checks the token's `iss`, `aud`, `exp`, `sub`, `email` and `email_verified`. Every answer clears
  the cookie. `from` is taken only as a path of this site, without its query, and it also gives the
  language of the messages and of a new account. A log line names what failed and no value.

**Whose account.** "Google answers" means the address ends in `@gmail.com` or the token has `hd`.

| Step | Found | Result |
|---|---|---|
| 1 | `email_verified` is not true | Refused |
| 2 | A row with this `googleId`, confirmed | Sign in |
| 2 | A row with this `googleId`, `_verified` taken off by the owner | Refused |
| 3 | Nothing at this address | New account |
| 3 | A row at this address with another `googleId` | Refused |
| 3 | Confirmed, no `googleId`, Google answers | Link by one atomic `updateOne`, sign in |
| 3 | Unconfirmed and waiting for its letter, Google answers | Delete it, new account |
| 3 | A row (confirmed or waiting), Google does not answer | Refused, "sign in by email and password" |
| 3 | Unconfirmed with no token, which only the owner causes | Refused |

A Google account on a third-party address with nobody at that address gets a new account: it takes
nothing from anybody.

**A new account** has a random 32-byte password that nobody knows, `_verified: true`, the names
Google gave clipped to 50 characters, and no number. One atomic write then clears the
`_verificationToken` that `payload.create` always sets; with it, a row the owner later unconfirms
would look as if it were waiting for a letter. As the password exists, no row without `hash` arises
and the guard of `auth-writes` works as it is. A reset letter sets a password of the person's own.

**The session** is the chain `loginOperation` runs after checking a password: the row with its
`hash`, `req.context.sessionWrite = 'adds'`, a transaction, `addSessionToUser`, `jwtSign`,
`generatePayloadCookie`. A password changed between the read and the write is refused, as for a
sign-in by password. The lock after five wrong passwords is not asked: it guards against guessing a
password, and whoever locks somebody else's account on purpose does not close this way to its owner.

**Staff.** Google always gives a `customers` session. The address of a member of staff gets a
shopper's account like any other, which opens nothing of the admin.

**The GET rule's one exception** is the callback, approved at the gate: what the rule guards against
is a scanner or a restart opening a link by itself, and neither has the cookie. Chromium's
`Critical-CH` restart was tested in real Chromium through the whole flow.

**Names are optional in the schema** (`firstName`, `lastName`), as Google may give none; registration,
the profile and the cart still ask through Zod.

**Without keys** the button is still a link and leads to a message: Google's keys stay on the server,
and no `NEXT_PUBLIC_` value is built in.

## Alternatives

How to talk to Google:

- **`arctic`:** a dependency for the 30 simplest lines; the risky part, whose account and the
  session, stays ours either way.
- **`payload-oauth2`, `payload-auth`:** write the row past `auth-writes` without knowing of it, add a
  second way of authenticating or replace the one there is, and put community code into sign-in.
- **Sign In With Google, One Tap:** Google's script on the pages and its own look of the button, and
  a token that comes through the browser needs its signature checked, so `jose` or cryptography by
  hand.

An address that already has an account:

- **Link on any `email_verified`:** whoever once held the address gets somebody's account with its
  orders. Google warns of exactly this.
- **Never link:** somebody who registered by email never gets in by Google, although Gmail proves the
  mailbox no worse than a reset letter does.

An unconfirmed row at the address:

- **Rewrite it with a random password:** the number of whoever registered would become a confirmed
  account's, which nobody proved, and a name or a number is easy to leave behind. Deleting removes
  all of it in one step; such a row has neither sessions nor orders. The letter already sent stops
  working.

No name from Google:

- **A placeholder ("—", part of the address):** made-up data in the admin, the cart and orders.

The button without keys:

- **Hide or disable it by `NEXT_PUBLIC_…`:** a value built in at build time, and one more variable in
  CI.

## Consequences

- Unconfirmed until one real sign-in on Production, as no test reaches Google: that Google Console
  accepts `sikora-beauty.vercel.app` as a domain (`vercel.app` is in the public suffix list's private
  section), that basic scopes show no "unverified app" warning, that PKCE works on a Web client. The
  stub in `tests/e2e/google-stub.mjs` checks PKCE, single use and the client's credentials, and
  `GOOGLE_STUB_URL` is for it alone.
- A Preview has no keys and leads to the message: Google cannot know its address in advance.
- A move to a domain of the store's own only adds an address and a domain to the same client; `sub`
  does not change and accounts stay.
- Somebody who once held a third-party address and has Google on it can create an account there while
  nobody else has. The address's real owner then sees it taken, sets a password by a reset letter,
  and the old Google stays linked. Rare; the owner removes it by deleting the account, as the admin
  does not show `googleId`.
- `john.doe@gmail.com` and `johndoe@gmail.com` are different addresses here, so a second account is
  possible. It opens nothing.
- The privacy page has to name Google (`launch readiness`).
- A revert with the migration's `down` keeps accounts made by Google, whose way in is then a reset
  letter; links go, and empty names become empty strings. After launch these are real people, so
  export first.
