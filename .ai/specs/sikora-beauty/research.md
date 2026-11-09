# Research — Sikora Beauty

Gathered on 2026-10-28. Facts the spec's decisions rest on.

## sisters.co.ua — the owner's example

Source: https://sisters.co.ua/ (home page).

- Menu: Hair, Face, Body, Home, Merch, New, Bestsellers, Sale, Sisters Choice, Brands; separately
  "Cosmetic ingredients" and "Care by purpose".
- Header: logo, UA/RU switch, search, sign-in, cart; favorites at `/cabinet/favorite`.
- No care-finder questionnaire.
- Card payment, Nova Poshta, pick-up; free delivery from 3000 UAH.
- Platform — likely Horoshop: paths `/thumb/<n>/images/…`, sign-in at `/site/auth-signin`. Not
  confirmed directly.

## cosmetika.com.ua — source of brands and SKUs

Source: https://www.cosmetika.com.ua/, its public WooCommerce Store API.

- WordPress 7.1.3 + WooCommerce 9.8.7 (`generator` meta).
- `GET /wp-json/wc/store/v1/products` — public, `X-WP-Total: 379` products.
- Category "БРЕНДИ" (`/wp-json/wc/store/v1/products/categories`):
  - Dr.Spiller — 84 products;
  - Instytutum — 33;
  - Braderm — 11;
  - Glymed+, Innoaesthetics, Me line, Dermafirm — **absent**.
- A product (example `?category=dr-spiller`): name, SKU, price in kopiyky (`231100` = 2311.00
  UAH), `is_in_stock`, 3 photos, a short description with "Склад: …" in the text. No attributes
  (empty `attributes`), no separate INCI, skin type, need or volume fields.
- Conclusion: base data for three brands; rich fields and the other brands come from other
  sources. Whether photos and texts may be used is an open question.

## Payload CMS

- `@payloadcms/plugin-ecommerce` is marked beta in the v3 and v4 docs; the default payment adapter
  is Stripe, others through the `PaymentAdapter` interface.
  https://payloadcms.com/docs/v4/ecommerce/overview.md,
  https://payloadcms.com/docs/v4/ecommerce/payments.md
- CVE-2026-105850 (October 2026): an order confirmation through the Stripe adapter could be
  processed more than once; fixed in 3.90.0.
  https://advisories.gitlab.com/npm/@payloadcms/plugin-ecommerce/CVE-2026-105850/
- Hence the decision: an own `orders` collection.
- npm on 2026-10-28: `payload` 3.92.1, `@payloadcms/translations` 3.92.1.

## i18n

- npm on 2026-10-28: `next-intl` 4.14.9, peer `next` up to `^16.0.0`; `next` 16.4.3.

## Medusa

- Current line — 2.22 (October 2026, per a third-party source).
  https://www.rigbyjs.com/blog/nodejs-security-update-october-2026-medusa
- The official storefront starter is Next.js; for Nuxt there are only community guides.
  https://epicmax.co/blog/how-to-create-medusa-js-with-nuxt-4

## monobank internet acquiring

- Receipts are issued automatically through an integration with Checkbox or є-чек set up in the
  merchant cabinet. https://monobank.ua/ecomm, https://monobank.ua/terminal/integrations
- Webhooks are signed; the signature is checked with the merchant's public key (section
  api-docs/acquiring/dev/webhooks). Confirm the Checkbox steps against the official docs before
  `mono payment`.

## Hosting and GitHub

- Vercel Hobby — non-commercial use only: "any Deployment that is used for the purpose of
  financial gain of anyone involved in any part of the production"; commercial use from Pro
  (~$20/month). Vercel Authentication with scope "All Deployments" is free on every plan;
  Password Protection is not available on Hobby. Hobby runs functions in one region, chosen in
  `vercel.json`. (vercel.com/docs/limits/fair-use-guidelines, …/deployment-protection,
  …/functions/configuring-functions/region)
- Neon Free — 0.5 GB storage, 100 CU-hours a month per project, scales to zero.
  (neon.com/faqs/free-plan-limits-and-quotas)
- Netlify Free allows commercial use, but a site is paused until the month ends once its credits
  run out.
- Coolify — a free self-hosted PaaS. Hetzner Cloud, 2 vCPU / 4 GB: CX23 €5.99/month and CAX11
  (Arm) €6.49 marked "not available" on 2026-10-28; CPX22 €19.99. Without a domain Coolify serves
  `http://<id>.<ip>.sslip.io` — HTTP only, so the panel, the API token and every password travel in
  the clear. (hetzner.com/cloud, coolify.io/docs/core/networking/domains)
- Payload has an official template for Cloudflare Workers + D1 + R2 (SQLite).
- GitHub: protected branches and rulesets in private repositories need GitHub Pro, Team or
  Enterprise.

Prices and plan terms as of October 2026; check before buying.

## Paying ahead: mono, LiqPay, Platon and a transfer

Gathered on 2026-11-06, for the split of `mono payment` (adr-20261106-transfer-to-the-store-account).

- **monobank (plata by mono).** 1.3% a transaction, 2% for a foreign card; payout the next day.
  A ФОП connects only with a mono ФОП account, confirmed in the mono app; the site must work, be
  in Ukrainian and show «Про нас», contacts and products with photo, description and price.
  https://monobank.ua/plata-by-mono, https://monobank.ua/knowledge-base/acquiring/signup
  - Invoices by JSON with `X-Token`, amounts in kopiyky; statuses `created`, `processing`, `hold`,
    `success`, `failure`, `reversed`, `expired`. The webhook carries `x-sign`, ECDSA over the
    SHA-256 of the raw body, with a key from `/api/merchant/pubkey` to be cached; up to three
    retries, no order guaranteed — the latest `modifiedDate` wins; none for `expired`, so
    `GET /invoice/status` reconciles. https://monobank.ua/api-docs/acquiring
  - A test token from https://api.monobank.ua/ takes any Luhn-valid card and moves no money.
  - With Checkbox linked in the web cabinet, mono issues the receipt from `basketOrder`, each item
    with its `code`; refunds send `items` for the return receipt.
- **LiqPay (PrivatBank).** The same 1.3% / 2%; payouts to a ФОП or company account at any bank,
  but without a Privat account the contract is signed in a branch, payouts come once a day and
  refunds come out of future payments. The signature is a shared-secret hash whose own docs
  disagree (SHA3-256 in the text, SHA-1 in the samples and SDKs); callback retries are not
  documented. https://www.liqpay.ua/uk/tariffs,
  https://www.liqpay.ua/uk/information/handbook/activation?tab=1
- **Platon** (PSP behind sisters.co.ua, «Оплата і доставка»). Onboarding through a manager; fees
  seen only in search snippets, 2.0% and 2.5%, both above mono's. https://sisters.co.ua/oplata-i-dostavka
- **Comparable shops.** cosmetika.com.ua offers mono and cash on delivery; battlersport.com mono,
  mono installments and a transfer to the account (`bacs`) — read from their public WooCommerce
  Store API, `/wp-json/wc/store/v1/cart`.
- **Fiscal receipts.** Single-tax groups 2 and 3 are not exempt (Tax Code п. 296.10 frees group 1
  only), and a card payment for goods bought online needs a receipt whatever the payment system
  (ГУ ДПС у Київській області, 02.06.2025, https://kyivobl.tax.gov.ua/kampaniya-prro/902774.html).
  A payment only to the ФОП's current account by its IBAN, not to a card, is no settlement
  operation and needs none (ГУ ДПС у Дніпропетровській області, 20.01.2022,
  https://dp.tax.gov.ua/media-ark/news-ark/557755.html). The reduced fines for single-tax ФОПs,
  25% / 50%, ended on 31.07.2025 (Law 265/95-ВР, Section II п. 15). Checkbox: 348 UAH a month a
  register. The accountant confirms the group and cash on delivery's receipts.
- **A personal account.** NBU Instruction 162 forbids taking a business's payments on a personal
  account: a transfer goes to the ФОП's IBAN.
- Hence: mono for cards, once the seller opens a mono ФОП account; a transfer to her Privat ФОП
  account meanwhile and after; no second card provider — neither fee nor card coverage asks for one.

## Nova Poshta API 2.0

Gathered on 2026-11-09, for `np-waybill` (adr-20261109-waybills-and-prepayment-only-start).
developers.novaposhta.ua answers 403 to automated readers and devcenter.novaposhta.ua fails TLS, so
this comes from api-portal.novapost.com, «API Docs UA», whose pages name
`https://api.novaposhta.ua/v2.0/` as their server. A claim marked (excerpt) was seen only in a search
result.

- **No sandbox.** Test keys exist only for the international API's stage host; «generating test keys for
  Ukraine is not supported». A `save` with a real key makes a real document.
- **`InternetDocumentGeneral.save`.** `WarehouseWarehouse`, `PayerType` `Recipient`, `PaymentMethod`
  `Cash`, `DateTime` `dd.mm.yyyy`, `Weight` from 0.1, `OptionsSeat` or `VolumeGeneral`, sender and
  recipient refs, phones as `380…`. No idempotency key appears in any schema. A failure is
  `success: false` with `errors` and `errorCodes`, and HTTP 200 (excerpt).
- **A recipient.** `Counterparty.save` with `PrivatePerson` and `Recipient`, its data in Ukrainian
  alone, then the Ref form of `save`. The by-string form wants names and a branch number as text.
- **A parcel locker.** `SeatsAmount` `1`, one `OptionsSeat` with all five fields, up to 40 × 60 × 30 cm
  and 20 kg, `Cost` up to 29,000 UAH.
- **Cash on delivery.** `BackwardDeliveryData` Money, «Післяплата»: NovaPay, 1% + 10 UAH with its cards,
  2% + 20 UAH otherwise, paid out to a non-business card or in cash.
  `AfterpaymentOnGoodsCost`, «Контроль оплати»: credited to the sender's account on a NovaPay
  «Договір післяплати», 0.5% to a NovaPay account, 1.3% to another; error codes say it is disabled for
  lockers, without saying when. Fiscal receipts: neither page mentions them.
- **Tracking.** `TrackingDocumentGeneral.getStatusDocuments`, up to 100 numbers. No webhook in the docs.
  Codes: 1 not handed over, 2 deleted, 7 and 8 at the branch, 9 received, 10 and 11 received with money
  sent, 102 and 103 refused, 105 storage ended, 106 received with a return waybill. The page calls none
  final, and may be incomplete (excerpt: 124).
- **The key.** Issued free in the business cabinet («Налаштування → Безпека»), «виключно фізичним
  особам», bound to the organizations chosen there, for a year (excerpt).
- **Printing.** The URL on `my.novaposhta.ua` carries the key.
- **Unconfirmed.** When a waybill can be deleted and what that costs; whether a personal cabinet's key
  makes waybills for a ФОП; published rate limits; how a return links to the original waybill.
