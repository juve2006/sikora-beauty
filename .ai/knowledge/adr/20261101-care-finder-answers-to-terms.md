---
id: adr-20261101-care-finder-answers-to-terms
type: adr
status: accepted
date: 2026-11-01
domains:
  - finder
  - storefront
  - catalog
  - consultation
paths:
  - src/globals/care-finder.ts
  - src/lib/finder.ts
  - src/lib/actions/finder.actions.ts
  - "src/app/*/(shop)/care-finder/**"
summary: The care finder is one Payload global (src/globals/) whose answers mean skin terms; a routine is the in-stock products of each step's categories ranked by shared terms, at /care-finder, off until enabled; a consultation keeps the answers as Ukrainian text
reviewed_at: 2026-11-01
---
# The care finder is a Payload global whose answers mean skin terms, and a routine is the in-stock products that carry them, step by step

Refines adr-20261030-header-menu-and-pages-from-payload: the header reads a third thing per
request, whether the care finder is on (`isFinderOn`), beside the menu's two queries. Refines
adr-20261030-consultation-requests: a request may carry the care finder's answers.

## Context

The spec promises a questionnaire that leads a shopper to a routine of products in stock, from
cleansing to SPF (GLOSSARY: Care Finder, Routine). Its open question 7 leaves the questions and
the rules to the cosmetologist, who is not technical and edits in the admin. The catalog already
tags each product with skin types, conditions and concerns, and those vocabularies are collections
the cosmetologist extends without a deploy. The roadmap pictured a step-by-step modal from the
header. On launch day the products' terms may still be thin, and the spec's risk 3 says the
questionnaire comes after the content. Source: task `care-finder`, the developer's decisions at its
gate and after its architecture review, 2026-11-01.

## Decision

- **One Payload global**, `care-finder` (`src/globals/care-finder.ts`, admin «Каталог → Підбір
  догляду»), registered in `payload.config` `globals`. Payload globals live in `src/globals/`, one
  per file, as collections do in `src/collections/`. Anyone reads it and both roles update it. It
  has no drafts: a save is live at once and revalidates the layout.
  - `enabled` «Показувати на сайті». While it is off the menu has no item and `/care-finder`
    answers 404, its routine addresses too.
  - `questions[]`: a localized question and hint, and whether several answers may be chosen. Each
    has `answers[]`: a localized label and the skin types, conditions and concerns it means, as
    relationships to the vocabularies. An answer that names none means nothing («Нічого з цього»).
  - `steps[]`: a localized title and the categories whose products the step takes.
  - All three arrays are `required`. Payload applies `minRows` only to a required array, so without
    it a saved question could have no answers and dead-end every shopper.
- **An answer is its array row's id** (Payload's 24-hex id), in the address (`?a=id,id`) and in a
  consultation request. It survives a reorder and an edited text. An id the questionnaire no longer
  has counts for nothing, and answers that no longer cover every question show «Анкета змінилась».
- **The matching is pure** (`src/lib/finder.ts`, Vitest):
  - `profile` joins the chosen answers' terms;
  - `routine` takes, per step, the in-stock products of its categories;
  - a product that names skin types but not the shopper's is left out, and one that names none
    suits everyone;
  - the score is the number of shared conditions and concerns, plus one for a named skin type;
  - ties go to the newest, and a step shows at most `ROUTINE_STEP_PRODUCTS` (2);
  - a product goes to the first step it fits;
  - a step with nothing in stock is the cosmetologist's, at a consultation.
- **The reads.** `finder.actions.ts` (`server-only`): `getFinder(locale)` reads the questionnaire;
  `getRoutine` makes one `getListingProducts` query (published, `in_stock`, the steps' categories)
  and hands it to `routine`; `isFinderOn` is the header's read of the switch. The catalog's
  `getMenu` does not know the finder.
- **A page, not a modal.** `/care-finder` (`force-dynamic`) shows one question per screen
  (`FinderQuestions`, a client component). The browser holds its state, and the last question
  pushes the answers into the address. With `?a=` the server renders the routine (`Routine`,
  `noindex`).
- **A request keeps the answers as text.** «Отримати консультацію» under a routine sends the ids.
  `requestConsultation` reads the questionnaire in Ukrainian and stores `finderAnswers`, a line
  «Питання — відповідь» per question, which no role changes. Consultation therefore depends on the
  care finder, not the other way.
- **The draft.** `seed:catalog` writes a draft questionnaire and five steps, off, only into a
  questionnaire with neither questions nor steps. Turning it on is the cosmetologist's call, once
  products carry their terms.

## Alternatives

- **The roadmap's modal from the header.** On a phone the menu's sheet would open a dialog from a
  dialog. The questions would ride every page with the header, and a routine with no address
  cannot be shared, and «Назад» would close it. A page on a phone already reads as a full-screen
  window.
- **Rules «answers X and Y → products Z».** The cosmetologist would keep hundreds by hand, and each
  new product would make them stale. Answers that mean terms reach a new product through its own
  terms.
- **Steps in code.** The roadmap puts the questions and rules in the admin, and a new category
  would need a deploy.
- **A collection of questions.** It is the same model on two admin screens instead of one, and the
  array already orders itself by drag.
- **The routine through a server action from the client.** That is one more endpoint and a loading
  state. A server-rendered `?a=` page is how the catalog's lists already work.
- **Made-to-order products in the routine.** The glossary's routine is products in stock, and a
  made-to-order product means days of waiting.
- **Answer ids in the request instead of text.** After the questionnaire changed, the cosmetologist
  would read nothing.
- **The questionnaire on from the start.** Without terms on products it would recommend the same
  few items to everyone (spec, risk 3).
- **The switch read inside `getMenu`.** The catalog would depend on the finder, which depends on
  the catalog. The architecture review found it, and the developer chose the finder's own read.

## Consequences

- A routine is only as good as the products' terms: the cosmetologist fills them before turning
  the finder on.
- The header makes three small queries per request, not two.
- Renaming or deleting an answer in the admin changes old `?a=` links. A request already sent
  keeps its text.
- A shopper's skin answers are personal data in a request, under the request's rules: only an admin
  role reads them, only the owner deletes, nothing is logged.
- Telegram does not carry the answers yet; the task that connects Telegram adds them.
- Undoing it: a revert and the migration's `down`. That drops the global's tables, with whatever
  the cosmetologist wrote, and `finder_answers` with the requests' answers, so export them first.
  While the finder is off, nothing a shopper sees changes.
