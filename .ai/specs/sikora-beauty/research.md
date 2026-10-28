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

- Vercel Hobby — non-commercial use only; commercial use from Pro (~$20/month).
- Netlify Free allows commercial use, but a site is paused until the month ends once its credits
  run out.
- Coolify — a free self-hosted PaaS; Hetzner Cloud — ~€4–6/month for 2 vCPU / 4 GB.
- Payload has an official template for Cloudflare Workers + D1 + R2 (SQLite).
- GitHub: protected branches and rulesets in private repositories need GitHub Pro, Team or
  Enterprise.

Prices and plan terms as of October 2026; check before buying.
