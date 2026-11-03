---
id: adr-20261103-phone-sign-in
type: adr
status: accepted
date: 2026-11-03
domains:
  - accounts
  - storefront
paths:
  - src/collections/customers.ts
  - src/lib/actions/account.actions.ts
  - "src/components/shared/account/**"
  - src/components/shared/header/account-link.tsx
  - src/components/shared/header/mobile-menu.tsx
  - src/migrations/20261103_110459_customer_phone.ts
summary: "Why a shopper signs in by a number nobody proves, in a dialog over the page: what stands in front of a number, who keeps it, and what it leaves open."
reviewed_at: 2026-11-03
---
# A shopper signs in by a number nobody proves, in a dialog over the page

Refines adr-20261103-customer-accounts, whose email, letters and guard stay: sign-in and registration
now open in a dialog from the header, and a shopper has a second way in.

## Context

On 2026-11-03 the developer asked for the sign-in form to repeat sisters.co.ua's dialog exactly — a
phone with a flag and `+380`, a password with an eye, «Забули пароль?», Google and «За Email» — and
for registration by phone, with a Google button that need not work yet. A number is a way in only if
it leads to one account. An SMS would prove it, at the price of a provider and money per message; the
developer chose without one. Production is behind the site password until the launch
(adr-20261029-site-password), and its accounts are test ones. Source: task `account-dialog`, the
developer's decisions at its gate.

## Decision

- **Registration asks for a name, a number, an email and a password; sign-in takes a number or an
  email.** The email is still confirmed by the letter and the password, and a reset still goes by
  letter. There is no SMS, so nobody proves the number.
- **A number only finds an account; the rest is the ordinary sign-in.** With `phone` in the form,
  `signIn` finds the email by the number in `customers` and goes on as by email: the same
  `loginOperation`, lock, session and `auth-writes`. An unknown number and a wrong password give one
  answer.
- **A number passes Turnstile first; an email does not.** Ukrainian numbers can be walked and the lock
  is per account, so it does not stop one common password tried across every number: locally 406
  numbers took 1.2 s and one opened an account (the review's F1, which the gate had not shown).
  adr-20261103-customer-accounts kept Turnstile off sign-in because `/api/customers/login` passes it
  anyway; REST takes only an email, so on a number's path it holds. Without keys it checks nothing, as
  everywhere until the launch, and a Production build without them fails once the site password is
  gone (RULES.md).
- **By number only `customers` are asked, never `users`.** Otherwise a stranger's attempts at a
  shopper's number would lock the account of staff who share that shopper's email. Staff sign in by
  email.
- **One number, one account, and only a confirmed account keeps it.** A unique index holds on every
  row. `claimPhone`, called by `register` and `updateProfile`: if nobody holds the number, or this row
  does, go on; if an unconfirmed row holds it, one atomic `db.updateOne` clears it where `_verified`
  is false and a token exists; otherwise `phoneTaken`. A race lands on the index and answers
  `phoneTaken` too. The row that lost the number stays without one and can still confirm. A
  registration that then does not happen gives the number back: a separate statement, not one
  transaction with the write, which would hold that row through Payload's reads (RULES.md). A profile
  save gives nothing back: its one write fails only if the owner deleted the shopper meanwhile or the
  database failed, and the row that lost the number can type it again.
- **A number is stored as `+380…`.** `accountPhone` reads nine digits and whatever `phone` reads. In
  the admin a field hook rewrites by `phone` alone, so nine digits are refused there; empty becomes
  `NULL`, and `validate` refuses the rest. The field stays optional: older accounts and a future
  Google sign-in may have none. The owner changes or clears a number in the admin, which is how the
  real holder gets back a number someone else took.
- **The dialog opens on the click.** `AccountLink` and the menu sheet's item stay links to `/account`.
  `useAccountEntry` asks the server action `isSignedIn` on a plain click: signed out, `AccountDialog`;
  signed in or no answer, `/account`. A modified click and a page without JavaScript follow the link.
  No page load asks, so cached pages stay cached. The menu's dialog sits outside the sheet, which
  closes, and the sheet is controlled, as `SheetClose` does not close after `preventDefault`. The
  dialog has no trigger, so `useAccountEntry` hands the focus back to what opened it, and closes it
  when the address changes, as the header outlives a page.
- **After sign-in from the dialog a shopper stays on the page**; staff go through `/account` to the
  admin. The forms on `/account` and `/account/verify` behave as they did: a shopper lands on the home
  page. `/account` keeps its two forms side by side.
- **The forms live in `src/components/shared/account/`**, as the header on every page and `/account`
  both use them.
- **Google is a disabled button with «скоро»** until `google-sign-in`. A password stays at least 8
  characters, not Sisters' 6.

## Alternatives

- **Payload's `loginWithUsername`, the number as a username** — a `username` column beside `phone`,
  required in existing rows; the same result for more.
- **An SMS code** — the number would be proved; it is paid and needs a provider, and the developer
  chose without it.
- **An index on confirmed rows only (`WHERE _verified`)** — nobody holds a number before confirming,
  but two unconfirmed rows may share one and the second fails on the letter's page; Payload generates
  no such index, so it is SQL outside its schema.
- **A check in code, no index** — two registrations at once get one number, and sign-in becomes
  ambiguous.
- **Never releasing a number** — anyone blocks someone's number for good without confirming anything.
- **A limit per IP instead of Turnstile** — processes on Vercel share no memory, so it needs a store
  of its own; Turnstile is already in the store's forms.
- **Asking who is signed in on each page load** — the dialog opens at once, at the price of a request
  per page, which the header avoids on purpose. **Always opening the dialog** — someone signed in
  sees a sign-in form.
- **Keeping the forms in `/account`'s folder** — the header would depend on a page's folder, which
  convention-storefront-components forbids.
- **`/account` switching its forms like the dialog** — more change for a page that fewer people see;
  a letter and a link without JavaScript still reach it.

## Consequences

- Until the launch the site password is what stands in front of a number: Turnstile has no keys yet,
  and Turnstile itself stops a walk only as far as solving it costs more than the walk is worth.
- No test runs the real widget: without keys `Turnstile` renders nothing, and CI has none. A failure
  with two widgets on `/account` showed only on Cloudflare's test keys, so sign-in by number and
  registration are repeated by hand with the real keys at the launch (roadmap item `launch readiness`).
- A number is not proved. Someone may give another person's number and confirm their own email; the
  real holder then sees «зайнятий», which gives access to nothing, and asks the owner.
- Whoever passes Turnstile can learn whether a number is registered: registration says so, and
  sign-in's answer time does (4 ms unknown, 67 ms known, locally). The same already holds for an
  email. Five wrong passwords lock an account for 10 minutes, so someone who knows a number can lock it
  on purpose.
- The profile form asks no Turnstile, so one confirmed session can walk numbers there: locally 300 in
  1.5 s named every confirmed number in the range and took the number from each unconfirmed row that
  held one (the review's F10). It opens no account and moves no confirmed number. Whether the form
  gets Turnstile is the developer's call before the site password comes off.
- The migration rewrote numbers to `+380…`, erased what `accountPhone` would not read, and among
  duplicates left the number on a confirmed row, then the oldest. All of that was test data.
- `numberTaken` reads the shape of an error from Payload and Drizzle: an upgrade that changes it shows
  a shopper `failed`. `tests/e2e/account.spec.ts` plays both races on the real index.
- The privacy page must name the number as a way in (roadmap item `launch readiness`).
- Undoing it: a revert; `down` drops the index, and numbers rewritten or erased do not come back.
  After the launch a shopper who signed in by number would still have their email.
