# Sikora Beauty — online store for professional skincare

Depth: normal + independent failure hunt — a real store with real money and non-technical
operators: every real decision is worth its own question, and the money path deserves an outside
look.

## Idea

In the developer's words (verbatim, Ukrainian):

> дивись це новий проект просто тестовий і тут я якраз би хотів обговорити про що цей проект
> буде і створити план детальний з фазами як в jig ui треба вибрати правильний стек детальний з
> уврахуванням як будемо деплоїти і де і все решту ось вимоги поврхневі основні

(Translation: "this is a new project, just a test one; I'd like to discuss what it will be and
make a detailed plan with phases like in jig-ui; pick the right stack, in detail, with how and
where we deploy, and everything else; here are the basic requirements.")

The requirements as the developer's brother — the store owner — sent them (verbatim, Ukrainian;
utm parameters removed from the link):

> Приклад сайту
>
> https://sisters.co.ua/
>
> Бренди які планую продавати
>
> Dr.Spiller
> Glymed+
> Innoaesthetics
> Me line
> Dermafirm
> Braderm
> Institutum
>
> Структура сайту
>
> На сайті має бути кнопка «підібрати догляд», де відкривається вікно з анкетою, та кнопка
> «отримати консультацію»
>
> 1.Головне меню
>
> 1. Каталог
> 2. За потребами шкіри
> 3. Бренди
> 4. Підбір догляду
> 5. Набори та новинки
> 6. Про Sikora Beauty
>
> У шапці сайту передбачити:
>
> • логотип
> • пошук
> • обране
> • кошик
> • зрозумілу навігацію
> • Кнопка «отримати консультацію»
>
> 2. Каталог за зонами застосування
>
> Обличчя
>
> • очищення;
> • тонізація;
> • сироватки;
> • креми;
> • маски;
> • пілінги та ексфоліанти;
> • догляд за шкірою навколо очей;
> • SPF;
> • догляд за губами.
>
> Тіло
>
> • очищення;
> • зволоження та живлення;
> • відлущування;
>
> Волосся та шкіра голови
>
> • шампуні;
> • кондиціонери;
> • маски;
> • незмивний догляд;
> • сироватки для шкіри голови;
> • пілінги для шкіри голови.
>
> 3. Каталог за типом шкіри
>
> • нормальна;
> • суха;
> • жирна;
> • комбінована.
>
> Передбачити окремі фільтри за станом шкіри:
>
> • зневоднена;
> • чутлива;
> • схильна до почервоніння;
> • схильна до висипань;
> • з порушеним захисним бар'єром.
>
> 4. Каталог за потребами шкіри
>
> • акне та висипання;
> • пігментація;
> • зневоднення;
> • чутливість і почервоніння;
> • підтримка шкірного бар'єра;
> • перші ознаки вікових змін.
>
> 5. Інші розділи каталогу
>
> • усі бренди;
> • новинки;
> • бестселери;
> • набори та комплекти;
> • мініатюри й travel-формати — за наявності.
>
> Категорії за типом шкіри та потребами мають працювати як фільтри
>
> Сторінка товару
>
> Для кожного товару передбачити такі поля:
>
> • назва бренду;
> • назва продукту;
> • об'єм або кількість;
> • ціна;
> • статус наявності;
> • фотографії;
> • короткий опис;
> • призначення та очікуваний косметичний ефект;
> • рекомендований тип або стан шкіри;
> • активні компоненти та пояснення їхньої ролі;
> • спосіб застосування;
> • застереження
> • склад INCI
> • кнопка «Додати в кошик»;
> • блок доставки й оплати;
> • рекомендовані супутні товари.
>
> https://www.cosmetika.com.ua/
>
> То Ярина скинула
>
> Тут можна взяти бренди і всі sku..

In short: a store for seven professional skincare brands with a "pick my care" questionnaire and a
"get a consultation" button; header with logo, search, favorites, cart and navigation; a catalog by
zone (face, body, hair and scalp) and category, with skin type, skin condition and skin need working
as filters; other sections (brands, new, bestsellers, sets, minis); a product page with the
listed fields. Later in the conversation: the site offers Ukrainian (default) and English.

## Goal and problem

- Who is worse off without this, and how: a shopper who does not know which professional product
  suits them — professional lines are usually recommended by a cosmetologist, not by a shop
  window; and the owner, who has no online sales channel of their own for these brands.
- What is true when the work is done: a shopper finds care by zone, skin type, condition and need —
  alone, through the questionnaire or through a cosmetologist — and buys it, paying by card or
  cash on delivery, delivered by Nova Poshta; the owner and the cosmetologist run the catalog,
  orders and requests in the admin without a developer.

## Stress test

- Hidden assumptions — "this holds only if …":
  - the site sells these brands online only if the distributors allow it (and on what terms for
    price and advertising) — otherwise the brand stays out of the catalog;
  - filters and the questionnaire help only if products carry skin type, condition and need —
    otherwise they return 0–2 products, or the same ones every time;
  - paying online is safe only if the paid item is really there — with mixed stock that is not
    guaranteed;
  - the store lives without a developer only if the admin covers every daily operation;
  - English pages help only if their texts are translated — otherwise they show Ukrainian
    fallback text.
- The main trade-off: own code (questionnaire, filters, own UX, no subscription) against depending
  on one developer working in spare time.
- The weakest point: a bus factor of one, combined with content — hundreds of products with a dozen
  rich fields each, now in two languages, reviewed by one busy person.
- Failure modes — cause, what breaks, the signal that shows it (from the independent failure hunt,
  ranked by likelihood × cost; after the arrow, what the spec does about it):
  1. Paid by card, item not in stock (manual availability, made-to-order items) → refund and a
     refund receipt, the customer leaves; signal: cancellations after payment. → Launch step 1
     takes orders confirmed by a manager; online payment only when every item is in stock.
  2. Bus factor of one → bugs and requests wait for weeks; signal: unanswered requests in chat,
     stale dependencies. → The admin covers daily operations, a runbook, Renovate; Horoshop
     stays the fallback.
  3. The cosmetologist is the content bottleneck → empty filters, the questionnaire recommends the
     same three products; signal: a pile of drafts in the admin. → Brands launch as they are
     ready, empty facets are hidden, the questionnaire comes after content.
  4. AI content errors pass review → invented INCI, medical claims; signal: an allergy complaint,
     Ads disapprovals. → INCI only from a source, with a link; a wording checklist; the
     cosmetologist reviews.
  5. monobank webhooks arrive twice, out of order or not at all (deploy, Cloudflare WAF); Checkbox
     register failures → "paid" at mono, "awaiting payment" on the site, duplicate receipts. →
     Idempotency, forward-only statuses, reconciliation by cron, a WAF exception, signature tests.
  6. Cash on delivery: fiscal receipts unclear, refused parcels, fake orders; signal: the
     accountant asks, returned parcels pile up. → Open question 4; a confirmation call; phone
     validation.
  7. Prices lag behind (EUR price lists) → negative margin. → Bulk price import from CSV/XLSX.
  8. Everything on one VPS: OOM during build, untested backups, secrets only on the server. →
     Build in CI, a tested restore, secrets in a password manager.
  9. Late Next.js/Payload patches with `/admin` open and personal data inside. → Cloudflare
     Access in front of `/admin`, Renovate.
  10. Distributor policy (minimum advertised price, online bans, trademark bidding in Ads);
      copyright on photos and texts from cosmetika.com.ua. → Open questions 1 and 3.
  11. Ads flying blind: no purchase event with value, the redirect to mono breaks attribution. →
      A purchase event on our own thank-you page, Consent Mode.
  12. Consultation requests get lost in a messenger. → Stored in Payload with a status.
  13. Instagram in-app browser: localStorage is lost when the page opens in Safari/Chrome. →
      Accepted risk, checked at launch.
  14. Searching "доктор шпіллер", Latin vs Cyrillic, typos → zero results. → pg_trgm + synonyms
      + a log of zero-result queries.
  15. The admin is confusing (nested fields, drafts, cache) → "I changed it, the site shows the
      old one". → On-demand revalidation, a short guide.
- Other shapes considered, and why this one:
  - **Horoshop (SaaS)** — likely what sisters.co.ua runs on: Nova Poshta, payments, fiscal
    receipts and filters out of the box, launch in weeks; but the questionnaire and custom UX are
    limited, and there is a monthly fee. Stays the fallback if development stops.
  - **Nuxt + Medusa v2** — a mature commerce core with an order admin; but 3–4 services to deploy,
    and rich content (actives, INCI) would need extra work or a separate CMS.
  - **Next.js + Payload (chosen)** — the requirements are 90% catalog, content and filters, which
    Payload gives out of the box (collections → admin, database schema, API, field localization);
    one application, one database.
  - **Launch in two steps (chosen) vs one** — the longest path to launch is content, not code;
    step 1 opens the catalog with a cart and manager-confirmed orders, and the riskiest code
    (webhooks, fiscal receipts) does not hold the launch back.

## Scope and non-goals

- In scope: the storefront (catalog by zone and category, filters by skin type, condition and
  need, brands, collections, a product page with every required field) in Ukrainian and English;
  search, favorites, cart and guest checkout; card payment and cash on delivery; Nova Poshta; the
  "pick my care" questionnaire; consultation requests; an admin for the owner and the
  cosmetologist; catalog import; deployment, backups, analytics.
- Not doing: customer accounts, languages beyond Ukrainian and English, stock sync with the
  distributor, reviews, promo codes, loyalty, blog (all fog after launch); a mobile app; booking a
  consultation in a calendar; marketplaces.

## Decisions

- Nature — a real store of the owner's, with real money; run day to day by the owner and the
  cosmetologist, who are not technical, so a Ukrainian-language admin is required.
- Shape — own Next.js + Payload CMS 3 application on Postgres — rejected: Horoshop, because the
  questionnaire and UX are limited and it has a monthly fee (stays the fallback); Nuxt + Medusa
  v2, because of 3–4 services and content fields to build.
- Orders — a small own `orders` collection — rejected: the Payload ecommerce plugin, because it is
  still beta and had CVE-2026-105850 (an order confirmation processed twice).
- Launch in two steps: step 1 — catalog, cart and orders confirmed by a manager (cash on delivery,
  or a monobank payment link the manager sends); step 2 — online card payment and Nova Poshta
  waybills from the admin — rejected: one launch with everything, because the first customer and
  SEO come later.
- Payment — card (monobank internet acquiring, fiscal receipt through Checkbox configured in the
  mono merchant cabinet) and cash on delivery through Nova Poshta — rejected: only one of the two
  (lost conversion, or refused parcels).
- Online payment only when every item is in stock; made-to-order items go through manager
  confirmation — rejected: paying for anything, because it produces refunds and refund receipts
  (failure 1).
- Stock is mixed; availability statuses: in stock / made to order (N days) / out of stock; set by
  hand in the admin at first — rejected: syncing with the distributor (fog until open question 2
  is answered).
- Consultation — a form, a record in Payload with a status and a message to a Telegram group; the
  cosmetologist then contacts the client — rejected: a bot message alone (gets lost), a Viber bot
  (paid), calendar booking (unneeded at first).
- Hosting (reversible) — production on a Hetzner VPS with Coolify; a Docker image tied to no host
  — rejected: Vercel Pro + Neon (~$20–40/month), Cloudflare Workers + D1 (SQLite, runtime limits),
  free tiers (sites suspended, VMs reclaimed).
- Development host (developer, 2026-10-28) — until `production host`, every merge deploys to Vercel
  Hobby with Neon Free, behind Vercel Authentication: $0, HTTPS without a domain, no server to run
  — rejected: Hetzner + Coolify from day one (a domain first, otherwise the panel, the deploy token
  and the passwords travel over plain HTTP; a server to run and pay for while nothing is sold).
  Hobby allows non-commercial use only, so the store moves before it sells anything.
- Reaching the development deployment (developer, 2026-10-29; was open question 12) — the store's
  own site password on the production domain (HTTP Basic in `src/proxy.ts`, `SITE_PASSWORD` in
  Vercel Production only, a Production build fails without it), shared by the owner and the
  cosmetologist, each then signing in to the admin with their own account; Vercel Standard
  Protection keeps the Previews to the developer; it moves to the production host and is removed
  at the launch (`deployment-access`, adr-20261029-site-password) — rejected: a shareable link
  (one per Hobby account, documented for Previews, anyone a link is forwarded to gets in), Vercel
  access requests or invitations (one external user per Hobby account), Vercel Pro with Password
  Protection ($20–40/month), `production host` before Phase 1 (a domain and a server paid from
  the first day), Standard Protection with no password (the unfinished storefront open to anyone
  with the address).
- Languages — the storefront in Ukrainian (default, at `/`) and English (at `/en`), with a switcher;
  UI strings through next-intl, product and page texts through Payload field localization (`uk`
  default, `en`, falling back to `uk` where a field is not translated yet); the admin UI in
  Ukrainian — rejected: Ukrainian only (the developer wants English), Next.js dictionaries without
  a library (locale routing, typed messages and formatting written by hand), Paraglide (less
  established with the App Router).
- Durable language — the spec, knowledge, ADRs, glossary and code comments are written in English;
  UI copy is Ukrainian and English.
- Accounts (reversible) — guest checkout, favorites in the browser — rejected: accounts in the
  first version (more code and personal data).
- Content — import base data; AI drafts of the rich fields and of English translations; the
  cosmetologist reviews and publishes through Payload drafts; INCI only from a source (packaging,
  brand, distributor) with a link, never generated by AI; no medical claims — rejected: entering
  everything by hand (weeks before launch).
- Reviewing English texts (developer, 2026-10-30; was open question 11) — anyone with an admin role
  reviews them; one «Перевірено» on a product covers both languages, and an AI or imported draft
  is not published before it; an untranslated field shows the Ukrainian text at `/en`
  (`content-drafts`, adr-20261030-ai-drafts-and-review) — rejected: a status per language
  (Payload publishes every locale at once), hiding untranslated products on `/en`.
- Consultation requests (developer, 2026-10-30; was open question 6) — the cosmetologist
  consults; the shopper leaves a name, a Ukrainian phone and, if they want, what concerns their
  skin, from the header or a product page, and is promised a call «найближчим часом», with no
  hours stated; requests, and orders later, go to one Telegram group of the owner and the
  cosmetologist (`consultation-request`, adr-20261030-consultation-requests) — rejected: a field
  for the way to be contacted, the button on the product page only or in the header only, a promise
  of an answer «протягом робочого дня».
- Delivery terms at checkout (developer, 2026-11-01; part of open question 5) — the shopper pays
  Nova Poshta at its rates on delivery, with no free-delivery threshold until the owner names one;
  the address comes from Nova Poshta's search, with the store's API key once there is one — it
  will be the developer's own — and without it until then (`cart-and-checkout`,
  adr-20261101-cart-and-checkout) — rejected: a free-delivery threshold now (no sum named), «the
  manager tells the delivery cost» (the shopper orders without knowing the terms).
- Orders and Telegram (developer, 2026-11-01) — orders reach the Telegram group in one later task
  that connects Telegram to every entity at once, not in `cart-and-checkout`; until then the
  manager sees them in the admin. Done in `telegram-notifications` (developer, 2026-11-02): the
  order's whole message, address included, and a request's care finder answers in full
  (adr-20261102-orders-and-answers-in-telegram) — rejected: a message without the address, or only
  a number, a total and a link; only a mark that a request has answers.
- Design — made within the project: 2–3 prototypes for the owner to choose from, a text logo —
  rejected: an outside designer (none available).
- Cache — price and availability refresh through on-demand revalidation from a Payload hook on
  save — rejected: timed ISR ("I changed it, the site shows the old one").
- Mobile from day one, mobile-first: a UI item is done only when it works at 360 px and on desktop
  — rejected: a mobile version as a later phase.
- Validation — Zod, one schema per boundary, shared by the client form and the server action,
  webhook or import — rejected: hand-written checks, client-only validation.
- CI as in jig-ui — a pull request runs one job per check (knowledge, audit, typecheck, lint,
  unit, build, docker, migrations, i18n; e2e and lighthouse once there are pages to check); a
  push to `master` runs the same CI as a gate before the image is built and deployed — rejected:
  deploying without a gate; one job running every check (a red run does not say which).
- Public information follows every deploy — each merge to `master` deploys, so the pull request
  that changes what the site does updates `README.md`, the docs it touches and the repository
  description — rejected: a documentation pass before launch (it describes a site that no longer
  exists).
- Canvas as in jig-ui — `/canvas` shows every component in every variant and state at mobile and
  desktop widths; each UI item adds its components there; in production only for a signed-in
  admin, `noindex` — rejected: Storybook (an extra dependency).
- Tasks — one roadmap item = one task = one pull request with a **Backend** and a **Frontend**
  section — rejected: separate `-api`/`-ui` tasks, because a backend-only task cannot be checked
  by eye and the seams between them breed bugs.
- No epic — each task merges into `master` through its own pull request and deploys at once; until
  the public launch only the developer, the owner and the cosmetologist can reach the deployment.

## Open questions

1. The right to sell each brand online: who the distributor is, whether there is a minimum
   advertised price, limits on trademark bidding in Google Ads — decides which brands are
   imported and how they are advertised.
2. The stock model: which items the owner holds, which are made to order and in how many days —
   decides the availability statuses and what can be paid online.
3. Data sources for Glymed+, Innoaesthetics, Me line and Dermafirm (not on cosmetika.com.ua);
   whether photos and texts from cosmetika.com.ua may be used — who they are to the owner —
   decides `catalog import`.
4. The sole proprietorship (tax group, bank), monobank acquiring or another, the Checkbox
   register; the accountant — how cash-on-delivery payments get fiscal receipts — decides
   `cart and checkout` and `mono payment`.
5. Nova Poshta: business account and API key, free delivery above a threshold — decides
   `np waybill`. Who pays for delivery is answered — see Decisions, "Delivery terms at checkout"
   (2026-11-01).
6. Answered — see Decisions, "Consultation requests" (2026-10-30).
7. The questionnaire's questions and matching rules — written by the cosmetologist — decides
   `care finder`.
8. The domain — needed by `production host`; the owner picks the store's name.
9. Prices: tied to EUR or not, who updates them and how often — decides `catalog import`.
10. Branch protection: GitHub Free does not protect branches of a private repository; GitHub Pro,
    or merging only on green CI by discipline — decides the "CI must pass" rule in
    `walking skeleton`.

## Assumptions left untested

- The catalog stays at ~600 SKUs or fewer, so Postgres search and one VPS are enough — taken at
  normal; tested by the real count once distributors answer.
- The cosmetologist has time to review products every week — taken at normal; tested by the first
  week of `content drafts`.
- mono + Checkbox issue fiscal receipts for online payments with no code of ours — taken at
  normal; tested by a test payment in `mono payment`.
- Cloudflare's cache absorbs traffic peaks from Ads at launch — taken at normal; tested by
  monitoring after `launch readiness`.
