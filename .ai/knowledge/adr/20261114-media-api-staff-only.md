---
id: adr-20261114-media-api-staff-only
type: adr
status: accepted
date: 2026-11-14
domains:
  - catalog
paths:
  - src/collections/media.ts
  - src/lib/access.ts
summary: REST and GraphQL read media for staff only, so the API lists no clean original past the store's mark; the storefront's Local API and a file's own address still read it for anyone
reviewed_at: 2026-11-14
---
# REST and GraphQL read photos for staff only; the storefront's Local API and a file's own address still read them for anyone

Refines adr-20261028-media-on-vercel-blob, whose `media` was readable by anyone so that `/api/media`
listed every photo, and closes the gap adr-20261113-product-photos-marked-when-shown left open. The
«`media` is readable by anyone anyway» of adr-20261029-site-password now holds for a file's own
address only.

## Context

Product photos carry the store's mark on the storefront (adr-20261113-product-photos-marked-when-shown),
but `media` read `() => true`: `GET /api/media`, `/api/media/:id` and GraphQL gave anyone every
photo's `url`, the clean original in Blob, and so did `GET /api/products?depth=1` and every other
REST read that populates a photo. Task `media-api-staff-only`.

Payload populates a relationship with the outer request's `overrideAccess` and `req`, and checks a
file at `/api/media/file/…` against the same `read` with `isReadingStaticFile`. The storefront reads
through the Local API with `overrideAccess: false` and no user, so `read` for staff alone would leave
it photo ids instead of photos, and the local disk's files, which next/image and the mark's endpoint
fetch, would answer 403.

## Decision

`media`'s `read` is `servedOrStaff` (`src/lib/access.ts`), true when any of these holds:

- `req.payloadAPI === 'local'`: the storefront's reads and server actions;
- `isReadingStaticFile`: the file at its own address, public in Blob anyway, which locally the mark's
  endpoint fetches;
- the user is on staff: the admin and its REST calls.

To a visitor and to a shopper REST answers 403 and GraphQL a Forbidden error; a REST read that
populates a photo gives its id. `payloadAPI` is set by Payload's server, never by the client.

## Alternatives

- **Staff only** — the storefront would lose every photo, as above.
- **REST and GraphQL off for `media`** (`graphQL: false`, no endpoints) — takes the file's route and
  the admin's REST calls with it: picking a photo for a product.
- **A private Blob store** — next/image needs public sources; a move of storage belongs to the
  production host.

## Consequences

- A Blob address someone already has keeps working: the file is public by its URL. Only the listing
  is closed; a photo uploaded in the admin sits under a random folder and cannot be guessed.
- Server code reading through the Local API with a request of its own sees every photo whatever its
  `overrideAccess`; the storefront decides which ones it shows. An endpoint that hands its REST `req`
  to the Local API reads as its caller would.
- A browser feature that needs photos reads them through a server action or a page, never
  `/api/media`.
- Undone by a revert: nothing in the database or Blob changes.
