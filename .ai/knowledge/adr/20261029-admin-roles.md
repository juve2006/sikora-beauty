---
id: adr-20261029-admin-roles
type: adr
status: accepted
date: 2026-10-29
domains:
  - admin
  - catalog
paths:
  - src/access.ts
  - "src/collections/**"
  - "src/catalog/**"
summary: Two admin roles, owner and cosmetologist; the access matrix in src/access.ts, every collection stating its own access
reviewed_at: 2026-10-29
---
# Every admin user is an owner or a cosmetologist, and access functions in code decide what each may do

## Context

Payload lets any logged-in user do anything by default: edit and delete every document, publish,
create users and change their passwords. Two non-technical people will run the admin — the owner
and the cosmetologist (GLOSSARY) — and money (prices) and other people's accounts must not be one
click away from either of them by mistake. Source: roadmap item `admin-roles`, the developer's
decisions of 2026-10-29.

## Decision

- `users` has one required `role`: `owner` («Власник») or `cosmetologist` («Косметолог»); a new
  user gets the cosmetologist unless the owner picks otherwise. A user without a role cannot open
  the admin. The developer's account is an owner.
- Who may do what lives in `src/access.ts`; every collection states its own `create`, `update` and
  `delete` access (a test fails when one does not):

  | | Owner | Cosmetologist |
  |---|---|---|
  | Users | everyone; sets roles | herself only; never a role |
  | Products | create, edit, publish, delete | create, edit, publish |
  | Price, availability, days to ship | set and change | read only |
  | Brands, zones and categories, skin vocabularies, photos | create, edit, delete | create, edit |

- Nobody changes their own role or deletes themselves, so the store always keeps an owner.
- The first user, created on an empty database, is an owner; the users who existed before roles
  became owners (the migration `20261029_094349_roles`).
- Both roles publish. This refines adr-20261028-reviewed-ai-content-drafts, whose "published only
  after the cosmetologist reviews it" guards AI and imported content from reaching shoppers
  unreviewed: in Payload a save of a published product publishes it, and the owner must change a
  published price without waiting for the cosmetologist. Reviewing AI content stays the
  cosmetologist's duty; blocking an unreviewed AI draft from publication belongs to the roadmap
  item `content drafts`, which marks those drafts.

## Alternatives

- **Several roles per user** — nobody is both; the owner's rights include the cosmetologist's.
- **Roles and permissions edited in the admin** (an RBAC plugin or our own) — a dependency or a
  permission editor for two non-technical people, who could then lock themselves out.
- **A third role for the developer** — the developer has the database already.
- **Only the cosmetologist publishes** — the owner could not change a published price without her.
- **The cosmetologist sets prices too** — money in two pairs of hands.
- **The owner as the default role** — a forgotten choice would make another owner.

## Consequences

- A new product of the cosmetologist's stays a draft until the owner sets its price and
  availability: both are required on publishing.
- A value a role may not change is dropped by Payload, not refused: the API answers 200 and keeps
  the old value. A version the cosmetologist restores brings back its texts and keeps the current
  price, availability and days (`keepOnRestore` in `src/catalog/products.ts`).
- A new collection — orders, consultation requests, settings — states its access per role in the
  task that adds it.
- A new role or right is a code change and a deploy.
- Locally Payload pushes the schema and gives existing users the default role; a local account
  becomes owner with `UPDATE users SET role = 'owner'`.
