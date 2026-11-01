# Sikora Beauty

Online store for professional skincare — Dr.Spiller, Glymed+, Innoaesthetics, Me line, Dermafirm,
Braderm, Institutum — with a care finder and cosmetologist consultations. Storefront in Ukrainian
(default) and English.

## Status

A home page at `/` (Ukrainian) and `/en` (English) in the store's own look — a text logo, a
language switch and a light and a dark theme that follows the device until the shopper picks
one — and the Payload admin at `/admin`. The home page, `/about` and any other page are built in
the admin under «Сторінки» from blocks — a banner, a collection's products, tiles into the
catalog, a consultation invitation, a text — and change without a deploy. In the admin
the catalog can be filled in: brands, zones and categories, skin types, conditions and
concerns, products with photos, as drafts and published. A product's English texts can be
filled from its Ukrainian ones with «Перекласти з української» (Chrome on a computer), and its
Ukrainian texts drafted by AI (Claude) from the brand's material pasted into «Заповнити з AI».
A product with an AI draft or a translation, and one brought by the import, waits under
«Перевірка текстів» and cannot be published until someone marks it «Перевірено»; words of a
medical claim are flagged as they are typed. Every admin user is an owner («Власник»: users, prices, availability,
deleting) or a cosmetologist («Косметолог»: fills in and publishes the catalog). The owner's
«Інструменти → Імпорт» page brings Dr. Spiller, Instytutum and Braderm from cosmetika.com.ua as
drafts with photos, texts and prices, and changes prices in bulk through a CSV. A published
product has its page at `/product/<slug>` (`/en/product/<slug>`): photos, price, availability,
its texts, delivery and payment, related products and «Додати в кошик». The
header's menu reads the zones with their categories and the skin concerns from the catalog, beside
links to the brands, the collections and the about page — in a sheet on a phone, with «Адмінка» for someone
signed in to the admin; `/catalog/<zone>` and `/catalog/<category>` list published products,
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
as they type (typed by hand when Nova Poshta does not answer), cash on delivery or a payment link
from the manager. The server prices the order again — a price changed meanwhile asks the shopper to
check the cart — and keeps its lines as they were sold; it waits in the admin under «Продажі →
Замовлення», where the manager moves its status forward and keeps a note, and `/cart/thanks` shows
its number. Orders do not reach Telegram yet.
`/canvas` shows every storefront component in every variant and
state; on a deployment only someone signed in to the admin sees it. Vercel deploys every push: `master` to Production, every other branch and pull request to a
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
skin vocabularies, brands, the home and about pages, and the first search synonyms while there are
none; it never changes what exists. Uploaded photos go to `./media`
unless `BLOB_READ_WRITE_TOKEN` is set (`.env.example`). «Заповнити з AI» needs
`ANTHROPIC_API_KEY` (console.anthropic.com); without it the button says AI is not set up. A
consultation request reaches Telegram with `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, and is
checked by Cloudflare Turnstile with `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`;
without the first pair a request is only saved, without the second it is not checked. A public
Production (no `SITE_PASSWORD`) does not deploy without the Turnstile keys. `.env.example` has Cloudflare's test keys.
The checkout searches Nova Poshta with `NOVA_POSHTA_API_KEY` when it is set and without a key
otherwise; whenever Nova Poshta does not answer, the shopper types the settlement and branch.

`npm run test:e2e` runs the checkout in Playwright (360 px and desktop, both languages) on a
production build — `npm run build` first — against a throwaway database: its migrations,
`npm run seed:catalog`, then `NODE_ENV=production npm run payload -- run tests/e2e/seed.ts`, with
`DATABASE_URL` pointing at it. A stub stands in for Nova Poshta. The first time,
`npx playwright install chromium`.

UI strings live in `messages/uk.json` and `messages/en.json`; both keep the same keys. The
storefront's colours, font and radii are tokens in `src/app/[locale]/globals.css`; its components
are shadcn/ui in `src/components/ui/` (`npx shadcn add <component>`), composed in
`src/components/shared/`, each shown on `/canvas`.

The code is laid out and written as in nextjs-store
([`adr-20261030-code-layout-nextjs-store`](.ai/knowledge/adr/20261030-code-layout-nextjs-store.md));
`npm run format` applies its prettier style, which CI checks.

## Checks and deploy

Every pull request runs CI (`.github/workflows/ci.yml`), one job per check: `typecheck`, `lint`,
`format` (prettier), `unit`, `build`, `migrations` (on an empty Postgres), `e2e` (the checkout in
Playwright), `i18n` (same keys in both message files),
`knowledge` (`jig knowledge check`), `audit` (`npm audit`, gitleaks).

Vercel deploys every push through its GitHub App, without waiting for CI: merge only a pull
request whose CI is green. A Production build applies migrations before `next build`; a Preview
uses the same database and never migrates it. Setup and rebuild: [`docs/deploy.md`](docs/deploy.md).

Work follows Jig — see [`AGENTS.md`](AGENTS.md).
