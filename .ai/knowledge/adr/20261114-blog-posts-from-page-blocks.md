---
id: adr-20261114-blog-posts-from-page-blocks
type: adr
status: accepted
date: 2026-11-14
domains: []
paths:
  - src/collections/posts.ts
  - src/lib/actions/post.actions.ts
  - "src/app/*/(shop)/blog/**"
  - "src/components/shared/blog/**"
  - src/components/shared/blocks/posts-block.tsx
summary: Why a blog post is its own drafts-enabled collection built from the pages' blocks, with a day field set on publishing and dates in the store's zone
reviewed_at: 2026-11-14
---
# The blog is a collection of its own, `posts`, written as drafts from the pages' blocks, with a day field the store sets on publishing

## Context

The owner wanted a blog: articles about care that they write in the admin, a list of them on the
storefront and a page for each. The spec left the blog as fog after the launch; the developer
started it on 2026-11-14 and chose drafts and three ways in — the footer's «Покупцям», a «Блог»
block for any page, an item of the header's menu.

A page (`pages`) already has a title, a slug and blocks, and goes live on save: pages have no drafts
(adr-20261030-header-menu-and-pages-from-payload). An article is written over days and must not
reach the storefront half done, it is listed by its day, and the list needs a cover and a summary
a page does not have. A date shown on the storefront must be the store's day, whatever the server's
zone — Vercel's is UTC.

## Decision

- A post is the collection `posts` («Запис блогу», admin group «Сторінки»): a localized title and
  summary (`excerpt`), the slug from the title (`slugField`), a cover from `media`, a day
  (`publishedAt`) and `blocks: pageBlocks` — the very blocks of a page, rendered by `PageBlocks`.
- `versions: { drafts: true }`. `access.read` gives staff every post and anyone else
  `{ _status: { equals: 'published' } }`; `readVersions` is staff only; create and update are
  `editors`, delete the owner's. The storefront reads with `overrideAccess: false`
  (`post.actions.ts`), so a draft is on no list, at no address and in no block. `storefrontHooks`
  revalidate on a publish or an unpublish, not on a draft's save.
- `publishedAt` is a field, not the published version's date: a `beforeChange` hook
  (`datePublished`) sets it to now when a post is published without one; a day the owner typed
  stays, so a post can carry an earlier day; an update that does not send the field keeps the
  stored one. The list sorts by it, newest first.
- `/blog` lists twelve to a page (`POSTS_PAGE_SIZE`), `?page=`, `force-dynamic`; a page past the
  last is 404. `/blog/<slug>` returns `[]` from `generateStaticParams`; its day and cover sit under
  the post's own heading, which it keeps over a banner block (a page's banner takes the heading).
  `blog` is in `RESERVED_SLUGS`.
- The block `posts` («Блог», typed `PostsBlock`) shows the newest three (`POSTS_IN_BLOCK`) and
  «Усі записи →»; with none published it shows nothing.
- next-intl's request config sets `timeZone: 'Europe/Kyiv'`, and `PostDate` formats with
  `useFormatter`, in the page's language.

## Alternatives

- **A post as a page with a flag or a parent «blog».** Rejected: pages are live on save, and drafts
  on `pages` would change every page's editing; the list needs a day, a cover and a summary, which
  would sit empty on every other page.
- **A rich-text body (Lexical) instead of blocks.** Rejected for now: a second editor and a second
  renderer, and the owner already writes pages with blocks; the `text` block holds paragraphs and a
  photo. A body with inline links and headings would bring it back.
- **The day from the published version (`PublishedAt`, as products show it).** Rejected: the owner
  could not give a post an earlier day, and the list would sort on a join over versions.
- **A date util of our own with its zone.** Rejected: next-intl formats in the page's language
  already; one `timeZone` in its config covers every date it formats.
- **Categories, tags, authors, comments, a sitemap entry, JSON-LD `BlogPosting`.** Left out until
  the blog has posts to need them.

## Consequences

- A new block in `pageBlocks` is a block of posts too: the migration grows tables under `posts`
  and `_posts_v` for it, and `PageBlocks` must keep a post's heading.
- A post's English texts fall back to Ukrainian until filled, as a page's do.
- In the admin's list, drafts with no day sort above the published posts (nulls first on
  `-publishedAt`).
- Undoing the blog is the migration's `down`, which drops the posts written since.
