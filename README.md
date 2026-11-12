# ROSYNASKIN

Online store for professional skincare and beauty gadgets — Dr.Spiller, Glymed+, Innoaesthetics,
Me line, Dermafirm, Braderm, Institutum — with a care finder and cosmetologist consultations.
Storefront in Ukrainian (default) and English. The repository and the services behind it keep the
earlier name, `sikora-beauty`.

## Status

A home page at `/` (Ukrainian) and `/en` (English) in the store's own look — the ROSYNA SKIN logo, a
language switch and a light and a dark theme that follows the device until the shopper picks
one — and the Payload admin at `/admin`. The home page, `/about` and any other page are built in
the admin under «Сторінки» from blocks — a banner, a collection's products, tiles into the
catalog, a strip of the brands' logos, a consultation invitation, a text — and change without a
deploy. In the admin the catalog can be filled in: brands with their logos, which `/brands` and a
brand's page show as tiles (the name while there is none), zones and categories, skin types, conditions and
concerns, products with photos, as drafts and published. A product's English texts can be
filled from its Ukrainian ones with «Перекласти з української» (Chrome on a computer), and its
Ukrainian texts drafted by AI (Claude) from the brand's material pasted into «Заповнити з AI».
A product with an AI draft or a translation, and one brought by the import, waits under
«Перевірка текстів» and cannot be published until someone marks it «Перевірено»; the list says the
way to the storefront, shows every field a product must have, and a product says when it went
live; words of a medical claim are flagged as they are typed. Every admin user is an owner («Власник»: users, prices, availability,
deleting) or a cosmetologist («Косметолог»: fills in and publishes the catalog). The owner's
«Інструменти → Імпорт» page brings Dr. Spiller, Instytutum and Braderm from cosmetika.com.ua as
drafts with photos, texts and prices, and changes prices in bulk through a CSV. A published
product has its page at `/product/<slug>` (`/en/product/<slug>`): photos, price, availability,
its texts, delivery and payment, related products and «Додати в кошик». The
header, olive with the client's colours, reads the zones with their categories from the catalog, a zone
marked «Окремий пункт меню» (beauty gadgets) also as an item of its own, beside links to the brands and
the about page and «Консультація» — in a sheet on a phone, with «Адмінка» for someone signed in to the
admin; the skin concerns and the collections are hidden from the menu for now, their pages still open;
the footer, cream with olive text, repeats the catalog's links beside a shopper's, among them payment
and delivery with returns, the terms of use (the public offer) and the privacy policy, with the contacts
the owner fills in at «Сторінки → Контакти», showing only what is filled in; far down any page, in
the store and in the admin, an arrow leads back up, and the store's header stays in view;
`/catalog/<zone>` and `/catalog/<category>` list published products,
24 to a page, filtered by skin type, condition, concern and brand and sorted by availability,
price or novelty; a product's skin type and concern lead to `/skin-type/<slug>` and
`/concern/<slug>`, the same list for that term. «Консультація» in the header and «Запитати
косметолога» on a product page take a shopper's name, phone and what concerns their skin; the
request waits in the admin under «Запити» (only an admin user reads it, only the owner deletes it)
and reaches the cosmetologist's Telegram group. «Пошук» in the header finds published products by
name, brand or active ingredient — in either language, in Cyrillic or Latin, with a typo or by a
synonym («доктор шпіллер») — six as you type, up to 48 at `/search?q=`; a query that found
nothing waits in the admin under «Пошук → Пошук без результатів», where synonyms are added under
«Синоніми пошуку». A heart on every product card and on a product page keeps the product in the
shopper's favorites — in their browser, no account — counted on «Обране» in the header; `/favorites`
shows them with today's prices, the newest first, and drops a product taken off the store.
The cart is kept the same way, counted on the bag in the header; `/cart` shows it with today's
prices and takes a guest's order under it: name, phone, a Nova Poshta settlement and branch found
as they type (typed by hand when Nova Poshta does not answer), a payment link
from the manager or, when every item is in stock and the owner has filled in «Продажі → Реквізити
для оплати», a transfer to the store's account — or a card on monobank's page, paid right after
the order, its receipt mailed by mono. The server prices the order again — a price changed
meanwhile asks the shopper to check the cart — and keeps its lines as they were sold; it waits in the
admin under «Продажі → Замовлення», where the manager moves its status forward, marks it paid and
keeps a note. The store starts on prepayment alone; cash on delivery comes later. On a confirmed, paid
order a button makes the Nova Poshta waybill from the box the manager measures, or the number of one
made in Nova Poshta's cabinet is typed in; once a day a cron asks how each parcel is doing, shows it on
the order and tells the Telegram group of one nobody collected. `/cart/thanks` finds the order by a secret its checkout was given and shows its
number — for a transfer, the account to pay, each detail with a copy button; for a card, whether
it paid, by mono's signed webhook or by asking mono on the way back and once a day, and another try
when it did not. The order reaches the same Telegram group as a request, a message with the contacts,
the address and the lines, and a link to it in the admin.
«Підбір догляду» (`/care-finder`) asks the shopper about their skin, one question a screen, and
builds a routine — cleansing, toning, serum, cream, SPF — of up to two products in stock a step,
the closest to the answers; «Отримати консультацію» under it sends the answers with the request, and
they reach the Telegram group with it.
The questions, what each answer means (skin types, conditions, concerns) and the steps (their
categories) are kept in the admin under «Каталог → Підбір догляду», where it stays off — no menu
item, no page — until «Показувати на сайті» is ticked.
«Кабінет» in the header, in the menu sheet on a phone, opens a sign-in dialog over the page; someone
signed in, or a browser without JavaScript, goes to `/account`. A shopper registers with a name, a
phone number, an email and a password and gets a letter in the language they registered in; its link
asks for that password, which confirms the email. They sign in by number or by email and stay on the
page; in «Кабінет» they change their name and phone, see their orders as the manager moves them along, and
find the checkout filled in. Nobody proves a number; a confirmed account keeps it, and the owner
changes or clears one in the admin. A shopper can also register and sign in with Google, and comes back to the same page; where Google hosts the address, it opens the account already there. Ordering without an account works as before, and nothing links an
earlier order. A forgotten password gets a letter too, staff's as well: the admin's own link leads to this form. The owner and the cosmetologist sign in
by email through the same form and land in the admin; a shopper's session opens nothing of it. Accounts wait
in the admin under «Продажі → Покупці»: both roles read them, the owner changes or deletes them, and
a deleted shopper's orders stay.
`/canvas` shows every storefront component in every variant and
state; on a deployment only the owner and the cosmetologist see it. A failure on the server or in a
browser reaches Sentry with what failed and where, never a shopper's data or a secret (`docs/deploy.md`,
step 15). Vercel deploys every push: `master` to Production, every other branch and pull request to a
Preview. Production asks for the site password, shared with the owner and the cosmetologist; a
Preview is visible only to the developer. Nothing is sold yet.

- Plan: [`.ai/specs/sikora-beauty/`](.ai/specs/sikora-beauty/) — spec, stack and the
  [roadmap](.ai/specs/sikora-beauty/roadmap.md) by phase.
- Next: Phase 2 — production host.

## Stack

Next.js 16 + Payload CMS 3 on Postgres, one application; next-intl; Zod; Tailwind CSS 4 and
shadcn/ui for the storefront. During development it
runs on Vercel (Hobby) with Neon Postgres; before launch it moves to Hetzner with Coolify, behind
Cloudflare. Details: [`stack.md`](.ai/specs/sikora-beauty/stack.md).

## Development

Needs Node 24 (`.nvmrc`) and Docker.

```
nvm use
cp .env.example .env          # then set PAYLOAD_SECRET: openssl rand -hex 32
docker compose up -d          # Postgres 17 on 127.0.0.1:5432
npm ci
npm run dev                   # http://localhost:3000, admin at /admin
```

Locally Payload creates the tables itself (`push`). A change to a collection also needs a
migration for the deployed database: `npm run payload -- migrate:create <name>`.

`npm run seed:catalog` (after `npm run dev` has created the tables) adds the zones, categories,
skin vocabularies, brands, the home, about, payment and delivery, terms and privacy pages, the first search synonyms while there are
none, and a draft of the care finder's questions and steps, off, while it has none; it never
changes what exists. Uploaded photos go to `./media`
unless `BLOB_READ_WRITE_TOKEN` is set (`.env.example`). «Заповнити з AI» needs
`ANTHROPIC_API_KEY` (console.anthropic.com); without it the button says AI is not set up. An
order or a consultation request reaches Telegram with `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
(`docs/deploy.md`, step 8), and is checked by Cloudflare Turnstile with
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`; without the first pair it is only
saved, without the second it is not checked. The same keys check a shopper's registration, their
letters and whatever tries a phone number. A public
Production (no `SITE_PASSWORD`) does not deploy without the Turnstile keys. `.env.example` has Cloudflare's test keys.
The checkout searches Nova Poshta with `NOVA_POSHTA_API_KEY` when it is set and without a key
otherwise; whenever Nova Poshta does not answer, the shopper types the settlement and branch.
The admin's waybill button also needs `NOVA_POSHTA_SENDER_CITY` and `NOVA_POSHTA_SENDER_WAREHOUSE`
(`docs/deploy.md`, step 18); without them it is off and nothing is created.
An account's letters go by SMTP with the `SMTP_*` variables (`docs/deploy.md`, step 9), which
Production does not deploy without. Elsewhere nothing is sent or logged: to follow a letter's link,
take the token from the `customers` table (`_verificationtoken`, `reset_password_token`).
The Google button needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (`docs/deploy.md`, step 10);
without them it leads to a message that Google is unavailable, as on a Preview.

`npm run test:e2e` runs the checkout, the care finder, the accounts and the rest in Playwright (360 px and desktop, both languages) on a
production build — `npm run build` first — against a throwaway database: its migrations,
`npm run seed:catalog`, then `NODE_ENV=production npm run payload -- run tests/e2e/seed.ts`, with
`DATABASE_URL` pointing at it. A stub stands in for Nova Poshta. The first time,
`npx playwright install chromium`. `-- --grep-invert account.spec` leaves out the accounts, as CI's
`e2e` does.

UI strings live in `messages/uk.json` and `messages/en.json`; both keep the same keys. The
storefront's colours, fonts (Onest, and Playfair Display for headings) and radii are tokens in
`src/app/[locale]/globals.css`, the header a scope of its own there; its components
are shadcn/ui in `src/components/ui/` (`npx shadcn add <component>`), composed in
`src/components/shared/`, each shown on `/canvas`.

The code is laid out and written as in nextjs-store
([`adr-20261030-code-layout-nextjs-store`](.ai/knowledge/adr/20261030-code-layout-nextjs-store.md));
`npm run format` applies its prettier style, which CI checks.

## Checks and deploy

Every pull request runs CI (`.github/workflows/ci.yml`), one job per check: `typecheck`, `lint`,
`format` (prettier), `unit`, `build`, `migrations` (on an empty Postgres), `e2e` (Playwright, all but
the accounts), `i18n` (same keys in both message files), `knowledge` (`jig knowledge check`), `audit`
(`npm audit`, gitleaks). The accounts' tests are two thirds of Playwright's, so they run apart, in
`.github/workflows/accounts.yml`, and only on a pull request that changes the accounts or the
lockfile. Every push to `master` runs all of Playwright there.

Vercel deploys every push through its GitHub App, without waiting for CI: merge only a pull
request whose CI is green. A Production build applies migrations before `next build`; a Preview
uses the same database and never migrates it. Setup and rebuild: [`docs/deploy.md`](docs/deploy.md).

Work follows Jig — see [`AGENTS.md`](AGENTS.md).
