---
id: adr-20261106-transfer-to-the-store-account
type: adr
status: accepted
date: 2026-11-06
domains: []
paths:
  - src/globals/payment-details.ts
  - src/lib/actions/payment.actions.ts
  - tests/payment-details.test.ts
  - "src/app/*/(shop)/cart/thanks/**"
  - src/lib/actions/order.actions.ts
  - src/collections/orders.ts
  - src/lib/orders.ts
summary: Why a shopper may pay ahead by a transfer to the store's IBAN, for an order wholly in stock, with a payment status apart from the order's and the thank-you page found by a secret token
reviewed_at: 2026-11-06
---
# A shopper may pay ahead by a transfer to the store's account, for an order wholly in stock, and the thank-you page finds the order by a secret

Refines adr-20261028-two-step-launch: in launch step 1 an order wholly in stock may be paid ahead by a
transfer, before the manager's call, which then confirms the dispatch rather than the payment — the
developer's decision of 2026-11-06. Refines adr-20261028-monobank-and-cash-on-delivery: a transfer is
a third way to pay, beside card and cash on delivery. Refines adr-20261101-cart-and-checkout: the
thank-you page reads the order by a secret token, as it deferred.

## Context

- Card payment goes through monobank (chosen 2026-11-06 over LiqPay and Platon), but the seller's mono
  ФОП account is still to be opened; her ФОП account is at PrivatBank. Small Ukrainian shops take
  transfers to their account beside card payment (battlersport.com offers one next to mono).
- NBU Instruction 162 forbids taking a business's payments on a personal account or card: a transfer
  goes to the ФОП's IBAN. A transfer to that IBAN is not a card payment and, as the tax service
  explained in 2022, needs no fiscal receipt; the store's accountant is to confirm it.
- A transfer is paid ahead, as a card payment is: adr-20261028-two-step-launch offers paying ahead
  only for an order wholly in stock, as a made-to-order line may not come and its money would go back
  by hand.
- The shopper needs the account right after ordering. The thank-you page showed the number from its
  address and read nothing (adr-20261101-cart-and-checkout), which deferred reading the order by a
  secret token.

## Decision

- `orders.payment` gains `transfer`, «Переказ на рахунок». The checkout offers it when the global
  `payment-details` («Продажі → Реквізити для оплати») has a recipient, an IBAN and a code, and every
  line is in stock (`canPrepay`); with a made-to-order line a line under the choices says a transfer
  needs every item in stock. `placeOrder` answers `changed` for a transfer with a line not in stock,
  and `failed` while the details are not filled in.
- The details: the recipient, the IBAN — `UA` and 27 digits, checked by mod 97, kept without spaces
  in capitals — and the code, an RNOKPP of 10 digits or an EDRPOU of 8. Anyone reads them; only the
  owner changes them, as an account taken over must not redirect the money.
- `orders.paymentStatus`, «Статус оплати»: `awaiting` → `paid`, apart from the order's status and
  forward only (`canMovePayment` in the `beforeChange` hook `keepPaymentForward`). A manager marks it
  on seeing the money on the account. Every order starts `awaiting`, whatever its payment; a card
  payment's webhook will move it too.
- Every order gets `returnToken`, 16 random bytes in base64url (22 characters), unique, which no role
  reads or changes through REST, GraphQL or the admin. `placeOrder` answers it, the checkout leads to
  `/cart/thanks?t=<token>`, and the page reads the order's number, sum and payment by it through the
  Local API (`getPlacedOrder`). For a transfer still awaiting payment, in an order not cancelled, it
  shows the recipient, the IBAN in fours, the code, the sum and the purpose «Оплата замовлення №N»,
  each with a copy button; a link kept for later asks for no money once the order is paid or
  cancelled. Without a token, or with one no order has, it names no order; `?order=N` is no longer
  read. This replaces the thank-you page of adr-20261101-cart-and-checkout.
- The purpose is Ukrainian in both languages: it lands on the seller's bank statement.

## Alternatives

- **Card payment only, through mono.** Waits on the seller's mono account. A transfer pays ahead now,
  and stays beside card payment after.
- **A transfer to the seller's own card.** NBU Instruction 162 forbids it, and a card-to-card payment
  counts as a card payment, which needs a receipt.
- **The manager gives the account on the call.** The shopper waits for a call to pay; the page has it
  at once.
- **The account in an environment variable or the code.** The owner could not change it without a
  deploy.
- **The thank-you page by the order's number.** Anyone could count through the numbers and read
  another order's sum and payment; by its secret only the browser that placed the order reads it.
- **The bank's statement matched automatically** (PrivatBank's business API, mono's personal API). A
  key and an integration of their own, for the few orders at launch; card payment's own
  reconciliation is the roadmap item `mono-reconcile`.
- **Paid as one more order status.** The two move apart: a confirmed order may be unpaid, a paid one
  not yet shipped.

## Consequences

- The manager reads the account's statement and marks an order paid by hand; an order whose transfer
  never comes stays `awaiting` until the manager cancels it, and a refund goes back from the bank by
  hand.
- The thank-you link is the shopper's only way back to the account; lost, they call the store.
- The product page names a transfer, but the checkout offers none until the owner fills in the
  details on Production.
- Undoing it is a revert and a redeploy; the migration's `down` drops the columns and the global, and
  fails while an order paid by transfer exists — such orders change their payment first.
