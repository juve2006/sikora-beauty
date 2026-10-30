---
id: adr-20261030-ai-drafts-and-review
type: adr
status: accepted
date: 2026-10-30
domains:
  - catalog
  - admin
paths:
  - src/lib/ai-draft.ts
  - src/lib/claims.ts
  - src/collections/ai-draft-endpoint.ts
  - src/components/admin/ai-draft.tsx
  - src/components/admin/claims-warning.tsx
  - src/components/admin/translate-button.tsx
  - src/collections/products.ts
summary: Claude Haiku drafts product texts from pasted brand material (no INCI); an AI or imported draft is not published until marked «Перевірено»; a wording checklist warns
reviewed_at: 2026-10-30
---
# Claude Haiku drafts a product's texts from pasted brand material, and a product drafted by AI or brought by the import is not published until a person marks it «Перевірено»

Refines adr-20261028-reviewed-ai-content-drafts: how the drafts are made, and how "published only
after review" is enforced. Carries out what adr-20261029-admin-roles left to this item: both roles
publish, and an unreviewed draft is blocked.

## Context

Hundreds of products need a dozen rich fields each; cosmetika.com.ua gives a shop's description at
best. The project had no LLM provider. Both admin roles publish (adr-20261029-admin-roles), so
nothing stopped an imported or machine-written text from reaching shoppers unread, and RULES.md's
"no medical claims" named a checklist that did not exist. Spec open question 11 asked who reviews
English texts. Source: task `content-drafts`, the developer's decisions at its gate (2026-10-30).

## Decision

- **Drafting.** «Заповнити з AI» in the product's Ukrainian locale: a person pastes the brand's
  material (its page, a leaflet, the distributor's text) and the server asks Claude Haiku 5.5
  (`claude-haiku-5-5`, `AI_MODEL` in `src/lib/ai-draft.ts`) through `@anthropic-ai/sdk`'s
  `messages.parse` for short description, purpose, actives with their roles, how to use and
  warnings. The answer's Zod schema (`aiDraft`) has no INCI, so the model cannot return one. The
  form fills only empty fields and actives only when there are none; nothing is saved by the
  button, and the material is not stored.
- **Where the code sits.** The pure parts — model, prompt, what to fill — are in
  `src/lib/ai-draft.ts`, shared with the admin form; the SDK call is in the endpoint
  (`POST /api/products/ai-draft`, `src/collections/ai-draft-endpoint.ts`), as the import's fetches
  are in `import-endpoints.ts`. Either role may call it; the body is `aiDraftRequest`.
- **The key.** `ANTHROPIC_API_KEY` in the host's environment, optional: without it, or empty, the
  endpoint answers 503 «AI не налаштовано» and the rest of the admin works.
- **The time.** 60 s per attempt and one retry, up to two minutes, inside the 300 s a Vercel Hobby
  function gets by default under Fluid compute; nothing pins it.
- **Review status.** `products.review`, not localized: `ai` «Чернетка AI — перевірте» (set by the
  AI button and by «Перекласти з української»), `imported` «Імпорт — перевірте» (set by the
  import), `reviewed` «Перевірено» (set by a person; a new product's default). `requireReview`
  refuses to publish while it is `ai` or `imported`; a save that does not send it keeps the
  product's own, so the owner's price list passes. It cannot be cleared in the admin. Products
  that existed before keep no status — none of them was reviewed under it — and are not blocked.
- **English (spec question 11).** One status covers both languages; anyone with a role reviews
  them. An untranslated field shows Ukrainian at `/en`, as adr-20261028-storefront-languages-uk-en
  already said.
- **Wording checklist.** The status field's description lists it; `src/lib/claims.ts` finds words
  of a medical claim (Ukrainian and English) and the admin shows them as they are typed. It warns
  and never blocks.

## Alternatives

- **Claude Opus 5.5 or Sonnet 5.5** — about $0.06 and $0.03 a product against Haiku's $0.002; the
  developer chose Haiku. A stronger model is the one constant.
- **Chrome's built-in Prompt API (Gemini Nano)** — free and local like the translator, but not
  generally available to web pages, and Ukrainian generation unconfirmed.
- **By hand through ChatGPT or claude.ai with a ready prompt** — no key, but copying back and forth
  for a non-technical person, and the AI mark rests on honesty.
- **The server reads the brand's page by URL** — server-side request forgery to guard, and brand
  sites often render in JavaScript. A PDF the model reads natively is the next step if material
  comes as PDFs.
- **Claude for English as well** — better than Chrome's translator, but paid, and the translator
  exists.
- **A status per language** — Payload publishes every locale at once; a status per locale needs
  its experimental `localizeStatus`.
- **The checklist blocks publishing** — «запалення» or «акне» can be right; false positives would
  stop the cosmetologist.
- **AI proposes skin types, conditions and concerns** — a wrong filter is worse than an empty one,
  and ticking them takes seconds.

## Consequences

- Each draft costs about $0.002 (Haiku 5.5, Anthropic's price on 2026-10-30), billed to the key's
  account. No live call was made in the task; the first one runs on the deployment.
- A refusal or an unparseable answer comes back as 502 with a message; Haiku has no server-side
  fallback model.
- After a refused publish Payload marks the form unmodified (its own behaviour for any server
  error on publishing): «Зберегти чернетку» stays off until the next edit, and leaving the page
  does not warn. The values stay in the form.
- The migration `20261030_100929_content_review` adds the column first and its default after, so
  existing rows stay empty; Payload's generated version would have marked them «Перевірено».
- The import marks what it creates; a product imported before this keeps no status.
