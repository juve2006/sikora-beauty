---
id: adr-20261109-card-reconciliation
type: adr
status: accepted
date: 2026-11-09
domains: []
paths:
  - src/lib/monobank.ts
  - src/lib/actions/card.actions.ts
  - src/lib/actions/payment.actions.ts
  - src/lib/orders.ts
  - src/collections/orders.ts
  - src/proxy.ts
  - src/lib/env.ts
  - vercel.json
  - tests/monobank.test.ts
  - tests/e2e/mono-stub.mjs
  - "src/app/*/(shop)/cart/thanks/**"
summary: Why a card's payment is also settled by asking monobank — on the shopper's return and by a daily cron with CRON_SECRET — each in one conditional statement, and why a failed card may get a new invoice only once mono says the old one is dead
reviewed_at: 2026-11-09
---
# A card's payment is also settled by asking monobank, on the shopper's return and by a daily cron, in one conditional statement; a failed card gets a new invoice once mono says the old one is dead

Refines adr-20261106-card-payment-on-monobanks-page, which left reconciliation to this task: mono's
webhook is no longer the only way a card's payment moves, nor the one request past the site
password. Source: task `mono-reconcile`, the developer's approval at its gate of 2026-11-09.

## Context

- mono sends a webhook on each change of an invoice but `expired`, in no guaranteed order and with up
  to three retries, so one can be lost: a lost `success` leaves a paid order «Очікує», and an
  `expired` invoice says nothing at all.
- `GET /api/merchant/invoice/status` answers the webhook's body. An invoice lives 24 hours by default.
- Whether mono lets a shopper pay an invoice again after `failure` is not known: its documentation
  refuses automated readers.
- Vercel Hobby runs a cron once a day, within the hour, on Production only, as a `GET` with
  `Authorization: Bearer <CRON_SECRET>`, at best effort: a run may be missed or doubled.
- A shopper whose card was refused had only the manager's call.

## Decision

- **One write, three ways.** The webhook, the shopper's return and the cron all call `settle`:
  `UPDATE orders … WHERE mono_invoice_id = ? AND payment_status IN (movesTo(next)) RETURNING`. No read
  comes before it, so there is no race; a repeat or an old word finds nothing; only the call that
  moved the row tells Telegram; `failure` and `success` end paid in either order. It goes past
  Payload's hooks, so `keepPaymentForward` now refuses anyone changing a card's payment through
  Payload, and `context.paymentProvider` is gone.
- **`expired` is `failed`.** For the shopper and the manager alike: no money, another try or a call.
- **The return.** A card still waiting, with an invoice, is asked of mono for at most three seconds
  while the page renders (`getReturnedOrder`), and the order is read again whatever came of it, as
  the webhook may have moved it meanwhile. No answer shows what the order has.
- **The cron.** `GET /api/mono/reconcile`, a root endpoint in `payload.config`, at 03:00 UTC
  (`vercel.json`): at most the 20 oldest card invoices still `awaiting` and older than 10 minutes,
  each asked of mono for at most five seconds, one failure not stopping the rest. `CRON_SECRET` is
  compared in constant time before anything is read; with none on the server it refuses everyone.
  Exactly this method and path pass the site password. A Production build with `MONO_TOKEN` and no
  `CRON_SECRET` fails.
- **Another try.** The thank-you page offers «Спробувати ще раз», with the receipt's address, for a
  card of an order `new` or `confirmed` that is `failed`, or `awaiting` without an invoice
  (`cardRetryable`). `payByCard` first asks mono of the old invoice: only `failure` or `expired` gives
  way; `success` marks it paid; anything else makes nothing. The new invoice replaces the old by one
  statement on the order as it was read, so of two tabs one keeps it, and one not kept gets no page
  to pay on.
- **No invoice.** On the first try the payment becomes a link and the manager is told, as before. On
  another try the order stays failed, with no link. An invoice mono made and the database did not
  keep gives no page to pay on, no link and no message that it was not made.
- **`failed → awaiting` is the new invoice's alone.** The table has the row; `keepPaymentForward`
  refuses it as a mark, so a manager still never takes one back.

## Alternatives

- **A status «Прострочено».** A truer word, for an enum value, a migration, an admin label and rows in
  the table; what follows from it is the same.
- **`payload.update` as before.** A read and a write apart: the webhook and the return nearly always
  coincide, so two Telegram messages would be the norm.
- **A row lock in a transaction.** It holds a connection across the queries, and
  adr-20261103-customer-accounts showed what that does to the store under load.
- **Leaving the order `failed` until a new event.** The shopper would read «не пройшла» while paying,
  and the cron would not see the invoice.
- **Believing our own `failed` before a new invoice.** One request fewer, on the shopper's money: a
  lost `success`, or an invoice mono still takes, would be paid twice.
- **Cancelling the old invoice by `invoice/remove`.** One more call, needless for a final invoice.
- **Polling from the browser on the way back.** More code and another public way in; this way the page
  is right from its first show.
- **A Route Handler outside `/api`.** next-intl would take it for a page and want another exception.
- **`CRON_SECRET` optional.** The cron would be refused every night and show only in the logs, which
  is the problem this solves.
- **A more frequent cron.** Vercel Hobby fails the deploy.

## Consequences

- `CRON_SECRET` must be in Vercel, Production, before a deploy with `MONO_TOKEN`, or the build fails
  and the site stays on the previous version.
- The live token may go in. An invoice nobody comes back to waits for the day's run, and a run Vercel
  misses for the next.
- A `success` for an invoice a retry already replaced finds no order and is answered 200. It can only
  happen if mono takes a payment after `failure`, which is not known; the truth is in mono's cabinet.
- Invoices mono cannot answer for, such as a replaced token's, keep their places among the 20 oldest.
- A card the manager took money for by a link is still not theirs to mark: it is told in the note.
- A `GET` of the thank-you page may move a payment, by mono's word and idempotently.
- At the production host the cron needs a scheduler of its own: `crons` in `vercel.json` are Vercel's.
- Undoing it is a revert and a redeploy: no migration, the statuses already moved are true, and
  `CRON_SECRET` may stay.
