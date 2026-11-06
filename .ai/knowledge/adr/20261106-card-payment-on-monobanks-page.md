---
id: adr-20261106-card-payment-on-monobanks-page
type: adr
status: accepted
date: 2026-11-06
domains: []
paths:
  - src/lib/monobank.ts
  - src/lib/actions/card.actions.ts
  - tests/monobank.test.ts
  - tests/e2e/mono-stub.mjs
  - src/proxy.ts
  - src/lib/orders.ts
  - src/collections/orders.ts
  - "src/app/*/(shop)/cart/**"
summary: "Why a card is paid on monobank's page right after ordering: the payments module makes the invoice, the webhook passes the site password by its signature, and the payment status moves by one table"
reviewed_at: 2026-11-06
---
# A shopper pays by card on monobank's page right after ordering; the payments module makes the invoice and only mono's signed webhook moves a card's payment status

Refines adr-20261028-monobank-and-cash-on-delivery: who makes the invoice, where its webhook lands,
how a late event is refused and what happens when mono makes no invoice — the task `mono-payment`.
Refines adr-20261106-transfer-to-the-store-account: the payment status gains `failed` and
`refunded`, and moves by a table instead of an order. Reconciliation — a retry, a check on the way
back, the cron and `expired` — is the task `mono-reconcile`.

## Context

- monobank acquiring takes an invoice (`POST /api/merchant/invoice/create`, header `X-Token`, the sum
  in kopiyky, a basket for the fiscal receipt and the addresses to mail it to), answers the page the
  shopper pays on, and tells the result by a webhook signed with ECDSA over the raw body (`x-sign`),
  sent up to three times until it gets 200. Checkbox in the mono cabinet issues the receipt from the
  basket.
- ARCHITECTURE: payments depend on orders, never the other way.
- `/api` is Payload's and the proxy passes it by next-intl, but until the launch the site password
  closes every request (adr-20261029-site-password), mono's too.
- The seller's mono account is not open yet: a test token takes test cards and moves no money.

## Decision

- `orders.payment` gains `card`, «Карткою на сайті», offered when `MONO_TOKEN` is set and every line
  is in stock (`canPrepay`, as a transfer); `placeOrder` answers `changed` otherwise.
- The order is placed first, as any order; the checkout then calls the server action `payByCard`
  (`src/lib/actions/card.actions.ts`, the payments module) with the order's return token and the
  receipt's address. It makes an invoice only for an order by card, `awaiting` and without one: the
  sum from the database, `reference` the order's number, `destination` «Оплата замовлення №N», the
  basket from the snapshot (`basketOrder`: each line's product id, quantity and price in kopiyky),
  `redirectUrl` the thank-you page by the token and `webHookUrl` `/api/mono/webhook`. The invoice's
  id is kept in `orders.monoInvoiceId` (unique; staff read it, nobody changes it). The browser goes to
  mono's page and the ordered lines leave the cart.
- The receipt's address, «Пошта для чека», is asked only for a card, prefilled for a signed-in
  shopper, and goes to mono alone: the order does not keep it.
- When mono makes no invoice — no token, the network, ten seconds, a refusal — the order is kept, its
  payment becomes `link`, the manager is told in Telegram to send a link, and the thank-you page
  says a link will come. A sale is never lost to mono.
- `POST /api/mono/webhook` is a root endpoint of Payload from `src/lib/monobank.ts`, registered in
  `payload.config`: the raw body; the signature by mono's key, cached and fetched again at most once
  a minute when a signature fails — 401 and nothing read otherwise, 503 while mono's key cannot be
  read, so mono sends the event again; the body through Zod — 400; the
  order by its invoice; then `nextPayment`. Every signed event is answered 200, the ones that change
  nothing too. `src/proxy.ts` lets exactly that method and path past the site password.
- The payment status moves by one table for every payment: `awaiting` → `paid` | `failed`,
  `failed` → `paid`, `paid` → `refunded`, nothing else. mono's `success`, `failure` and `reversed`
  map to `paid`, `failed` and `refunded`; any other status, a repeat or an event the table refuses
  moves nothing — mono moves an invoice only forward, so such an event is an old one.
- A card's payment status is changed only by the webhook, which writes with
  `context.paymentProvider`; `keepPaymentForward` refuses anyone else, the owner included. Paid and
  failed cards are told in Telegram; a refund is made by hand in mono's cabinet and its webhook marks
  the order «Повернено».
- The thank-you page for a card: paid; waiting for the bank, with «Оновити», while the invoice is made
  and nothing came back; otherwise failed, and the manager calls.

## Alternatives

- **`placeOrder` makes the invoice.** Orders would depend on payments, against ARCHITECTURE. The
  separate call costs a gap: a browser that leaves between the two leaves an order by card without
  an invoice, which the thank-you page calls failed and the manager follows.
- **The webhook as an endpoint of the `orders` collection.** The collection would import the payments
  module. **A Next route outside `/api`** would get a locale from next-intl and need another
  exception in the proxy.
- **The time of mono's last event, kept to refuse older ones.** One more field and a comparison of
  dates refusing what the table already refuses.
- **The receipt's address kept with the order.** The manager needs none, and it is more personal
  data. **No address at all** waits on whether mono's page asks for one itself, to be seen on a live
  test payment.
- **An error in the form when mono makes no invoice.** The order would have to be deleted, or the
  invoice made before the order, without its number.
- **«Спробувати ще раз» for a failed card here.** One more action, a new invoice and its tests;
  it goes with `mono-reconcile`, before which no live token is set.
- **A refund from the admin** through `invoice/cancel`. An endpoint, roles and partial sums for a rare
  case; needed if mono's cabinet makes no refund receipt itself — not yet known.

## Consequences

- A card paid but whose webhook never came stays «Очікує» until `mono-reconcile`; the truth is in
  mono's cabinet. So the live token goes in only after `mono-reconcile`; until then only a test one.
- A failed card is the manager's call; a card made to order is still a payment link. An order by
  card that failed, or was left before its invoice, cannot be marked paid by the manager even once
  they took the money by a link: its payment is read-only and its status mono's alone. It is told
  in the note until `mono-reconcile` gives it a way.
- mono's webhook is the one request that passes the site password; the signature is all that
  authenticates it. A Preview behind Vercel Authentication gets no webhook.
- `tests/e2e/mono-stub.mjs` signs with a key of its own and stands for mono in e2e
  (`MONO_API_URL`).
- Undoing it is a revert and a redeploy; the migration's `down` drops the column and the enum
  values, and fails while an order by card, failed or refunded exists — such orders change first.
