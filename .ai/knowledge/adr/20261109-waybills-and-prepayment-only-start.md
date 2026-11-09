---
id: adr-20261109-waybills-and-prepayment-only-start
type: adr
status: accepted
date: 2026-11-09
domains: []
paths:
  - src/lib/novaposhta.ts
  - src/lib/cron.ts
  - src/lib/orders.ts
  - src/lib/constants/index.ts
  - src/lib/env.ts
  - src/lib/validators.ts
  - src/collections/orders.ts
  - "src/components/admin/waybill-*.tsx"
  - src/proxy.ts
  - vercel.json
  - tests/waybill.test.ts
  - tests/e2e/waybill.spec.ts
  - tests/e2e/novaposhta-stub.mjs
  - "src/app/*/(shop)/cart/checkout-form.tsx"
summary: Why a waybill is made from the admin for a paid order alone and one to an order behind one conditional statement, why a daily cron with CRON_SECRET tracks parcels and moves nothing else, and why the store starts on prepayment with cash on delivery later
reviewed_at: 2026-11-09
---
# A waybill is made from the admin, for a paid order and one to an order, behind one conditional statement; the store starts on prepayment and cash on delivery comes later

Refines adr-20261028-monobank-and-cash-on-delivery and adr-20261028-two-step-launch: cash on delivery
no longer comes with the launch. Widens adr-20261029-site-password and
adr-20261109-card-reconciliation: one more request passes the site password. Source: task
`np-waybill`, the developer's approval at its gate of 2026-11-09.

## Context

- Nova Poshta's API 2.0 has no sandbox for Ukraine, so a `save` with a real key makes a real document.
  `save` has no idempotency key, and a logical error comes back as HTTP 200. What was read and what
  stayed unconfirmed: `.ai/specs/sikora-beauty/research.md`.
- A key is issued to a person from a business cabinet and expires. The seller has neither yet.
- Cash on delivery is two services. «Післяплата» (`BackwardDeliveryData`) pays out to a non-business
  card or in cash, and NBU Instruction 162 keeps a business's money off a personal account. «Контроль
  оплати» (`AfterpaymentOnGoodsCost`) credits the ФОП's account, but needs a NovaPay contract and has
  error codes for parcel lockers. The fiscal receipt for either is unanswered.
- Vercel Hobby runs a cron once a day, within the hour. Nova Poshta documents no webhook.

## Decision

- **Prepayment alone, at the start.** `CHECKOUT_PAYMENTS` (`link`, `transfer`, `card`) is what the form
  offers and `orderRequest` accepts, so the server refuses `cod`. `PAYMENTS` keeps it, for the column
  and the orders that hold it. A made-to-order line is paid by a link once the manager confirms it.
- **Who gets one.** A confirmed or shipped order, paid, whose address has Nova Poshta's refs:
  `waybillBlock`, which the form shows and the server decides by, on the row as it reads it. The
  button is an admin role's; nothing is read before that holds.
- **One to an order.** Before Nova Poshta is asked, one conditional statement takes the order
  (`claimOrder`, `waybillRequestedAt`). A refusal or a failure before `save` frees it. A `save` nobody
  answered keeps it, as a waybill may exist: the manager looks in Nova Poshta's cabinet and types the
  number, or presses «Створити ще раз», which takes a request older than a minute, or an order a
  failed retry freed. A waybill Nova Poshta says was deleted leaves the order free.
- **The request.** Branch to branch, the recipient paying the delivery, a recipient made by
  `Counterparty.save` from the order's name and phone, and no cash-on-delivery field. The manager types
  the box's weight and sizes, as only they know them. The sender is the key's first counterparty and
  contact; the city and branch parcels leave from are two variables, and without them the button is
  off, so the developer's key cannot make a document by accident.
- **A number by hand.** Staff may type a 14-digit `waybillNumber`, for a waybill made in Nova Poshta's
  cabinet. A changed number clears the code, the status and the claim. An empty field keeps the stored
  number (`keepWaybill`), as Payload saves every field and a form opened before the waybill existed
  holds an empty one: a number can be replaced, never cleared by hand.
- **Tracking.** `GET /api/np/track` at 04:00 UTC (`vercel.json`): `CRON_SECRET` before anything is read,
  then at most the 100 oldest unfinished numbers of orders younger than 60 days, one request, one
  conditional write each. A parcel refused or out of storage (102, 103, 105) tells Telegram, from the
  call that moved it. An unknown code counts as unfinished. Exactly this method and path also pass the
  site password. A Production build with the sender's branch and no `CRON_SECRET` fails.
- **Tracking moves nothing else.** The order's status and payment stay the manager's.
- **The boundaries.** The two endpoints are root endpoints of Payload in `src/lib/novaposhta.ts`, which
  therefore is not `server-only`: delivery depends on orders, not the other way. `fromCron` moved to
  `src/lib/cron.ts` so that delivery does not depend on payments. The key lives only in the body of
  the server's requests. Nova Poshta's words reach staff alone, and the log holds only its codes.
- **Printing stays in Nova Poshta's cabinet.**

## Alternatives

- **Cash on delivery now, by «Контроль оплати».** The best candidate when it comes, but a NovaPay
  contract and the accountant's answer would hold this task.
- **«Післяплата».** Whether a ФОП needs a contract is not known, and it pays out only to a non-business
  card or in cash.
- **Both, by the kind of branch.** Two code paths before anyone knows a locker really refuses.
- **Removing `cod` from the schema.** An enum migration and a new value for old orders, for something
  that is coming back.
- **Refusing `cod` in the form alone.** The server would take it from a forged request.
- **Weight and sizes on products.** Hundreds of products to fill in, and a box's weight is not the sum.
- **A collection `shipments`.** A table, access rules and a screen for one to one.
- **`getDocumentList` before a retry.** The match's format is not confirmed, for a rare case.
- **Disabling the button in the browser alone.** Two tabs would make two waybills.
- **`saveWarehouseByStringDocumentJson`.** It wants names and a branch number as text, which the order
  does not keep apart.
- **The sender from a page in the admin.** A new screen for a value that hardly changes.
- **The international API.** No test key for Ukraine, and not checked for domestic waybills.
- **Moving the order by tracking codes.** The list of codes is incomplete and an order's status does
  not go back, so a mistake could not be undone.
- **A proxy for the print form.** The link carries the key, and whether it works without a session
  cannot be known without a real key.

## Consequences

- After the merge the button is off: it needs the seller's key and the two variables. The first real
  waybill settles what the docs left open: a recipient without a patronymic, the sum's and the phone's
  format, `volumetricVolume`, the tracking answer's field names, whether a person's key makes one for a
  ФОП.
- The key expires, and with it the button and the tracking, until someone renews it.
- A page seeded earlier keeps its cash-on-delivery paragraph until someone removes it by hand.
- An order older than 60 days is no longer tracked, even if its waybill is younger.
- Of two tabs on one order, one holding an old number can overwrite a number made again after a
  deletion.
- At the production host the cron needs a scheduler of its own.
- Bringing cash on delivery back starts from one line in `CHECKOUT_PAYMENTS`, and needs the texts, the
  waybill's field and the contract.
- Undoing it is a revert and a redeploy, which turn the button and the cron off. The migration's `down`
  drops the numbers, so they are exported first, and the waybills made stay at Nova Poshta.
