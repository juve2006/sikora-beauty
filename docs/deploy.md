# Deploy — development on Vercel + Neon

How the development deployment is built and how to rebuild it from nothing. No secret is written
here: each one is created once, stored in the password manager, then pasted where it is used.

Production moves to Hetzner + Coolify behind Cloudflare before launch (roadmap item
`production host`); Vercel's Hobby plan is for non-commercial use only.

## What runs where

| Piece       | Where                                                                                                                      | Notes                                                                                                                                                             |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application | Vercel project, Hobby plan, functions in `fra1`                                                                            | connected to this repository through the Vercel GitHub App                                                                                                        |
| Deploy      | Vercel, on every push                                                                                                      | `master` → Production; any other branch or pull request → Preview                                                                                                 |
| Database    | Neon Free, Frankfurt, through the Vercel Marketplace                                                                       | one database for Production and Preview; 0.5 GB, scales to zero                                                                                                   |
| Photos      | Vercel Blob store `sikora-beauty-media`, public, `fra1`                                                                    | one store for Production, Preview and Development (adr-20261028-media-on-vercel-blob)                                                                             |
| Migrations  | `npm run vercel-build` (`vercel.json` `buildCommand`)                                                                      | Production only: `payload migrate` over the direct connection, then `next build`; Preview only builds                                                             |
| Checks      | GitHub Actions CI on every pull request                                                                                    | not a gate before the deploy: merge only a pull request with green CI                                                                                             |
| Errors      | Sentry, free plan, organization `sikora-bw`, project `sikora-beauty`                                                       | the server and the browser; only what `src/lib/sentry.ts` lists leaves, and nothing starts without the DSN                                                        |
| Access      | the site password (`src/proxy.ts`) on the production domain; Vercel Authentication, scope Standard Protection, on the rest | the owner and the cosmetologist reach Production with the password, then sign in to `/admin`; only the Vercel account owner reaches a Preview or a deployment URL |

## Secrets and settings

| Name                                                                | Kind                                                                                                                          | Lives in                                                                                                                                                                    |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                      | Neon pooled connection                                                                                                        | Vercel env, Production and Preview (set by the Neon integration)                                                                                                            |
| `DATABASE_URL_UNPOOLED`                                             | Neon direct connection                                                                                                        | Vercel env, Production and Preview (set by the Neon integration)                                                                                                            |
| `PAYLOAD_SECRET`                                                    | 32+ random characters, one per environment                                                                                    | Vercel env, Production and Preview, Sensitive                                                                                                                               |
| `BLOB_READ_WRITE_TOKEN`                                             | Blob store token                                                                                                              | Vercel env, Production, Preview and Development (set by Vercel when the store is connected); the build fails without it                                                     |
| `SITE_PASSWORD`                                                     | the site password, 12+ characters, shared with the owner and the cosmetologist                                                | Vercel env, Production only, Sensitive; the Production build fails without it                                                                                               |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`                            | the bot that posts orders and consultation requests, and the group it posts to                                                | Vercel env, Production only, the token Sensitive; without them an order or a request is only saved                                                                          |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`            | Cloudflare Turnstile widget keys for the consultation form, the checkout and a shopper's account                              | Vercel env, Production, the secret Sensitive; set both or neither, and a Production without `SITE_PASSWORD` fails without them                                              |
| `NOVA_POSHTA_API_KEY`                                               | the developer's Nova Poshta API key (business cabinet → Settings → Security), the seller's own once waybills start (step 18)  | Vercel env, Production, Sensitive; optional — without it the checkout searches Nova Poshta without a key, and when Nova Poshta does not answer the shopper types the branch |
| `NOVA_POSHTA_SENDER_CITY`, `NOVA_POSHTA_SENDER_WAREHOUSE` | Nova Poshta's refs of the city and the branch parcels leave from | Vercel env, Production only; optional — without them the admin's waybill button is off |
| `MONO_TOKEN` | monobank acquiring's token: a test one from api.monobank.ua, then the seller's ФОП account's own | Vercel env, Production only, Sensitive; optional — without it the checkout offers no card; the live one replaces it without code |
| `CRON_SECRET` | 16+ random characters the daily reconciliation of mono's invoices and the tracking of parcels are called with; Vercel sends it as `Authorization: Bearer …` | Vercel env, Production only, Sensitive; required while `MONO_TOKEN` or `NOVA_POSHTA_SENDER_WAREHOUSE` is set, or the Production build fails |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | the store's Gmail for the letters of a shopper's account: `smtp.gmail.com`, `465`, its address, its app password, its address | Vercel env, Production only, the password Sensitive; the Production build fails without them; elsewhere no letter is sent or logged                                         |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                          | the Web client a shopper signs in with Google through                                                                         | Vercel env, Production only, the secret Sensitive; set both or neither; without them the button leads to a message                                                          |
| `NEXT_PUBLIC_SENTRY_DSN`                                            | where failures are sent; public, the browser holds it                                                                         | Vercel env, Production only; read at build, so a change needs a Redeploy; without it nothing starts and nothing is sent                                                     |
| `SENTRY_AUTH_TOKEN`                                                 | an Organization Auth Token, for uploading source maps                                                                         | Vercel env, Production only, Sensitive; without it no maps are made and a browser's stack stays unreadable                                                                  |

## Build it from nothing

1. **Vercel account.** Sign up at vercel.com with GitHub, Hobby plan.
2. **Project.** In the repository: `npx vercel@64.0.2 link` → create a new project named
   `sikora-beauty`. It writes `.vercel/project.json` (git-ignored).
3. **Repository.** GitHub → Settings → Applications → Vercel → Configure → give it access to
   this repository; then `npx vercel@64.0.2 git connect`. Check Settings → Environments →
   Production → Branch Tracking: `master`. Then let Vercel report deployments to GitHub — this
   project was created with that off, and the repository page then lists none:
   `echo '{"gitProviderOptions":{"createDeployments":"enabled"}}' | npx vercel@64.0.2 api
/v9/projects/sikora-beauty -X PATCH --input -`.
4. **Database.** `npx vercel@64.0.2 integration add neon --plan free_v3 -m region=fra1
-m auth=false -e production -e preview --no-env-pull`. Check that the project's environment
   variables include `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for Production and Preview. The
   CLI may also install Neon agent skills into the repository (`.agents/`, `.claude/skills/neon*`,
   `skills-lock.json`): delete them.
5. **Payload secrets.** For each of Production and Preview: `openssl rand -hex 32` → password
   manager → Vercel → Settings → Environment Variables → `PAYLOAD_SECRET`, that environment only,
   Sensitive.
6. **Photos.** `npx vercel@64.0.2 blob create-store sikora-beauty-media --access public
--region fra1 -e production -e preview -e development --yes`. It connects the store and sets
   `BLOB_READ_WRITE_TOKEN`; it also writes the token into `.env.local` — copy it to the password
   manager, then delete the file.
7. **Protection.** A password of 12+ characters from the password manager's generator → Vercel →
   Settings → Environment Variables → `SITE_PASSWORD`, Production only, Sensitive. Then Settings →
   Deployment Protection → Vercel Authentication on, scope **Standard Protection**: Vercel keeps
   Previews and deployment URLs, the site password keeps the production domain.
8. **Orders and consultation requests in Telegram.** In Telegram, @BotFather → `/newbot` → the
   token → password manager → `TELEGRAM_BOT_TOKEN`, Production only, Sensitive. Create a group with
   the owner and the cosmetologist and add the bot; it needs no admin rights. Everyone in the group
   reads shoppers' names, phones, addresses and skin answers, and the messages stay there when an
   order or a request is deleted in the admin: asked to delete a shopper's data, the owner deletes
   those messages too. Send `/start@<bot's username>` in the group — a bot in privacy mode, the
   default, sees commands and service messages, not ordinary ones — then, within 24 hours, open
   `https://api.telegram.org/bot<token>/getUpdates`: `chat.id` (negative) → `TELEGRAM_CHAT_ID`,
   Production only. A group that Telegram upgrades to a supergroup gets a new id: sends then fail
   with `Telegram:` in the host's log, until the new id is set and Production is redeployed.
   Before the site opens: Cloudflare → Turnstile → add a widget (Managed) for the production
   domain → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` (Sensitive). Then register,
   sign in by number and change the number in «Кабінет» on that domain by hand: no test runs the
   real widget, as CI has no keys (adr-20261103-phone-sign-in).
9. **Letters to shoppers.** A Gmail account of the store's own, never a person's → Google Account
   → Security → 2-Step Verification on → App passwords → create one → password manager. Vercel →
   Settings → Environment Variables, Production only: `SMTP_HOST` `smtp.gmail.com`, `SMTP_PORT`
   `465`, `SMTP_USER` and `SMTP_FROM` its address, `SMTP_PASSWORD` the 16 characters without
   spaces, Sensitive. Gmail sends about 500 letters a day; `launch readiness` replaces it with the
   domain's mail. A changed Google password revokes the app password: letters then fail with
   `Account` in the host's log and nobody can register, until a new one is set and Production is
   redeployed.
10. **Sign-in with Google.** Google Cloud Console, free: a project → the consent screen, External,
    status In production, only `openid email profile`, the domain `sikora-beauty.vercel.app` → a
    home page and the privacy link `/privacy` on the Branding page, without which «Publish app» stays
    grey (the page comes from step 13, so publish after it; no logo, which can ask for a review) → a
    client of type Web, redirect URI
    `https://sikora-beauty.vercel.app/api/customers/google/callback` → `GOOGLE_CLIENT_ID` and
    `GOOGLE_CLIENT_SECRET` (Sensitive) in Vercel, Production only, then redeploy. No test reaches the
    real Google: sign in once by hand on that domain. A new domain only needs its redirect URI and
    domain added to the same client, and `SITE_URL` names it; accounts stay.
11. **First deploy.** Push to `master` (or redeploy the latest Production deployment in Vercel).
12. **First admin.** Open the production URL, give the site password (any user name) → `/admin` →
    create the first user with a password from the password manager. From then on `/admin` shows
    the login page.
13. **Catalog seed.** Zones, categories, skin vocabularies, brands, the home, about, payment and
    delivery, terms and privacy pages and the first search synonyms (only while there are none),
    once: copy
    `DATABASE_URL_UNPOOLED` (Production) from Vercel → Settings → Environment Variables, then
    `DATABASE_URL="$(pbpaste)" PAYLOAD_SECRET="$(openssl rand -hex 32)" npm run seed:catalog`.
    The seed signs nothing, so a throwaway secret will do, and the URL never enters the shell
    history. It prints how many records it created; run again, it creates none.
14. **Products from cosmetika.com.ua** (after the seed: it needs the brands). As the owner,
    `/admin` → Інструменти → Імпорт → «Перевірити» → «Імпортувати нові». The page sends a few
    products at a time and must stay open; the photos go to Blob. Interrupted, «Перевірити» shows
    what is left; run again, it creates none.
15. **Errors in Sentry.** sentry.io, free plan: Create Project → Next.js, named `sikora-beauty`, in the
    organization `sikora-bw` (`next.config.ts` names both). Skip the onboarding's
    `npx @sentry/agent-plugin`: it only installs a plugin into a coding assistant. Project Settings →
    Security & Privacy → **Prevent Storing of IP Addresses**, as Sentry sees a browser's address by
    itself, and under Advanced Data Scrubbing the rule **Remove**, **Anything**, from `$user.geo.**`:
    Sentry adds a browser's city and country from that address. A new project, the store's own
    included, needs both again. An Organization Auth Token for source maps. In Vercel, Production only:
    `NEXT_PUBLIC_SENTRY_DSN` (Project Settings → Client Keys) and `SENTRY_AUTH_TOKEN` (Sensitive), then
    redeploy. Without the token everything works but a browser's stack is unreadable. A server failure has no stack in Sentry at all: its file and line are in Vercel's logs.
16. **Payment details** (the owner, after the deploy that brings them). `/admin` → Продажі →
    Реквізити для оплати: the ФОП's name as the bank has it, the account's IBAN and the RNOKPP, from
    the bank's statement. Until all three are filled in, the checkout offers no transfer. Only the
    owner can change them.
17. **Card payment through monobank.** A test token first: api.monobank.ua, signed in with the mono
    app → password manager → `MONO_TOKEN`, Production only, Sensitive → redeploy; `CRON_SECRET`, random,
    16+ characters, goes in first, as Production does not build with the token without it. Not on a
    Preview: Vercel Authentication refuses mono's webhook. A test payment takes any card number that passes
    the Luhn check and moves no money. The live token, from the seller's ФОП account at mono,
    replaces it without code. `vercel.json` has Vercel call `GET /api/mono/reconcile` once a day, within
    the hour after 03:00 UTC, on Production only: Project → Settings → Cron Jobs lists it and runs it
    by hand, and Logs shows a run's status code. With the live token: Checkbox turned on in mono's cabinet, which
    issues the fiscal receipt from the invoice's basket; the card's paragraph on «Оплата та
    доставка» and monobank's line on «Конфіденційність», as `src/db/seed-data.ts` has them.
18. **Waybills from the admin** (once the seller has a Nova Poshta business cabinet on the ФОП). The key
    from that cabinet (Settings → Security; it is issued to a person and expires, so it goes in a
    calendar) replaces `NOVA_POSHTA_API_KEY`. `getWarehouses` names the branch parcels leave from:
    its `Ref` goes into `NOVA_POSHTA_SENDER_WAREHOUSE` and its `CityRef` into `NOVA_POSHTA_SENDER_CITY`,
    Production only → redeploy; `CRON_SECRET` goes in first, as Production does not build with the branch
    without it. Until then the button says «Накладні не налаштовані» and nothing is created. Nova
    Poshta has no test mode for this API: the first waybill is a real one, so it is made for a real
    parcel, and what it answers settles what the docs left open (a recipient without a patronymic, the
    sum's format, `volumetricVolume`). `vercel.json` has Vercel call `GET /api/np/track` once a day,
    within the hour after 04:00 UTC, on Production only.
19. **Prepayment only.** The checkout no longer offers cash on delivery, and the seed never changes a
    page that exists: on a database seeded earlier, «Сторінки → Оплата та доставка» still has it, so its
    paragraph «При отриманні» («On receipt» in English) is removed by hand and the page saved.

## Check it

- Without the site password, the production URL, `/admin` and `/api/users` answer `401` and the
  browser asks for it. A Preview URL and a deployment URL show Vercel's login page instead.
- With it: `/` is Ukrainian, `/en` English, `/admin` the Ukrainian Payload login.
- A request sent from «Консультація» shows in `/admin` → Запити and in the Telegram group.
- An order placed at `/cart` shows in `/admin` → Замовлення with its number from `/cart/thanks`,
  and in the Telegram group. With every item in stock and the payment details filled in, «Переказ
  на рахунок» is offered, and its `/cart/thanks` shows the details; «Скопіювати» puts the IBAN
  without spaces on the clipboard. With `MONO_TOKEN` set, «Карткою на сайті» is offered too and
  asks for an email; the order opens mono's page with its sum, and a paid test card comes back to
  «Оплату отримано», the order «Оплачено» in `/admin` and «Оплачено карткою» in the Telegram group.
- At `/account`, a new account gets its letter, in the language it registered in; its link opens the
  sign-in form, and the account's password there confirms the email and leads to the home page.
  Signed in, an order shows in «Кабінет» and in `/admin` → Замовлення, with its «Покупець». The owner signs in at the same form and lands in
  `/admin`; a shopper's session at `/admin` lands in their own account.
- Sentry, in the browser's console on the production URL: `setTimeout(() => { throw new Error('Sentry
test') })` shows as a browser event with no city under its user; `fetch('/api/customers/login', { method: 'POST', headers: {
'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a\u0000@example.org', password:
'x' }) })` answers 500, writes nothing and shows as a server event.
- To change the password: a new `SITE_PASSWORD` in Vercel, then redeploy Production.
- Before an Instant Rollback or Promote to a Production deployment older than the site password
  (built before `adr-20261029-site-password`), switch Deployment Protection to All Deployments:
  that deployment has no gate, and Standard Protection leaves the production domain open.
- A pull request shows its Preview from `vercel[bot]`; the repository page lists Production and
  Preview under Deployments.

## Preview and the database

A Preview reads and writes the same database as Production but never changes its schema. A pull
request that adds a migration therefore breaks its own Preview on the pages that use the new
fields until it is merged. While the data is test data this is accepted; the production host
revisits it (adr-20261028-vercel-git-deploys).

## Take it down

Delete the Vercel project (this also removes its connection to the repository), the Blob store
(Vercel → Storage), the Neon database (Neon console), and the Payload secrets, the Blob token and
the site password from the password manager.
