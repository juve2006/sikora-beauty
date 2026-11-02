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
| Access      | the site password (`src/proxy.ts`) on the production domain; Vercel Authentication, scope Standard Protection, on the rest | the owner and the cosmetologist reach Production with the password, then sign in to `/admin`; only the Vercel account owner reaches a Preview or a deployment URL |

## Secrets and settings

| Name                                                     | Kind                                                                           | Lives in                                                                                                                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                           | Neon pooled connection                                                         | Vercel env, Production and Preview (set by the Neon integration)                                                                                                            |
| `DATABASE_URL_UNPOOLED`                                  | Neon direct connection                                                         | Vercel env, Production and Preview (set by the Neon integration)                                                                                                            |
| `PAYLOAD_SECRET`                                         | 32+ random characters, one per environment                                     | Vercel env, Production and Preview, Sensitive                                                                                                                               |
| `BLOB_READ_WRITE_TOKEN`                                  | Blob store token                                                               | Vercel env, Production, Preview and Development (set by Vercel when the store is connected); the build fails without it                                                     |
| `SITE_PASSWORD`                                          | the site password, 12+ characters, shared with the owner and the cosmetologist | Vercel env, Production only, Sensitive; the Production build fails without it                                                                                               |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`                 | the bot that posts orders and consultation requests, and the group it posts to | Vercel env, Production only, the token Sensitive; without them an order or a request is only saved                                                                          |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile widget keys for the consultation form and the checkout    | Vercel env, Production, the secret Sensitive; set both or neither, and a Production without `SITE_PASSWORD` fails without them                                              |
| `NOVA_POSHTA_API_KEY`                                    | the developer's Nova Poshta API key (business cabinet → Settings → Security)   | Vercel env, Production, Sensitive; optional — without it the checkout searches Nova Poshta without a key, and when Nova Poshta does not answer the shopper types the branch |

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
   domain → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` (Sensitive).
9. **First deploy.** Push to `master` (or redeploy the latest Production deployment in Vercel).
10. **First admin.** Open the production URL, give the site password (any user name) → `/admin` →
    create the first user with a password from the password manager. From then on `/admin` shows
    the login page.
11. **Catalog seed.** Zones, categories, skin vocabularies, brands, the home and about pages and
    the first search synonyms (only while there are none), once: copy
    `DATABASE_URL_UNPOOLED` (Production) from Vercel → Settings → Environment Variables, then
    `DATABASE_URL="$(pbpaste)" PAYLOAD_SECRET="$(openssl rand -hex 32)" npm run seed:catalog`.
    The seed signs nothing, so a throwaway secret will do, and the URL never enters the shell
    history. It prints how many records it created; run again, it creates none.
12. **Products from cosmetika.com.ua** (after the seed: it needs the brands). As the owner,
    `/admin` → Інструменти → Імпорт → «Перевірити» → «Імпортувати нові». The page sends a few
    products at a time and must stay open; the photos go to Blob. Interrupted, «Перевірити» shows
    what is left; run again, it creates none.

## Check it

- Without the site password, the production URL, `/admin` and `/api/users` answer `401` and the
  browser asks for it. A Preview URL and a deployment URL show Vercel's login page instead.
- With it: `/` is Ukrainian, `/en` English, `/admin` the Ukrainian Payload login.
- A request sent from «Консультація» shows in `/admin` → Запити and in the Telegram group.
- An order placed at `/cart` shows in `/admin` → Замовлення with its number from `/cart/thanks`,
  and in the Telegram group.
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
