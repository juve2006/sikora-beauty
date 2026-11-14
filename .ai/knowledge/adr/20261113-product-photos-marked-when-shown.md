---
id: adr-20261113-product-photos-marked-when-shown
type: adr
status: accepted
date: 2026-11-13
domains:
  - catalog
  - storefront
paths:
  - src/lib/watermark.ts
  - src/lib/wordmark.ts
  - src/lib/product-page.ts
summary: Product photos get the store's wordmark when shown, through GET /api/photo/v1/:id/:filename with sharp, cached a year; the Blob original stays clean for the admin and Merchant Center
reviewed_at: 2026-11-14
---
# A product photo carries the store's mark, made when the photo is shown; the original stays clean

Refines adr-20261028-media-on-vercel-blob: its «No `sharp`» becomes `sharp` for the mark only, still
with no `imageSizes`. Widens adr-20261029-site-password by one more GET past the gate.

Refined by adr-20261114-mark-in-cosmetikas-place (2026-11-14): the mark's middle at 90.75% of the
height, a patch over cosmetika's mark, the photo carried out to the card's frame, as `/photo/v2`.

## Context

The client's mockup of a product photo (`.ai/workspace/client-feedback-2026-11-12/69-product-photo-watermark.png`)
has ROSYNA SKIN over YOUR BEAUTY EDIT at the foot of the product, in their olive. They want it «in
the file», against copying, and added automatically when a photo is uploaded. Merchant Center, which a
future feed will need, refuses an `image_link` with «superimposed logos or store names». Task
`photo-watermark`.

## Decision

- **The mark is composited when a photo is shown**, by a Payload root endpoint
  `GET /api/photo/v1/:id/:filename` (`src/lib/watermark.ts`, `markedPhoto`): it reads the media by
  id, answers 404 unless the file name is the photo's current one and its type `image/*`, fetches
  the original from `media.url` (a local disk's relative URL against `SITE_URL`), composites the mark
  with `sharp` and answers WebP q92 with `Cache-Control: public, max-age=31536000, immutable`. Its
  route params pass `markedPhotoParams` in `src/lib/validators.ts`.
- **The original in Blob is never rewritten or copied.** The admin and the Merchant Center feed read
  `media.url`, the clean photo.
- **Only product photos are marked.** `productPhotos()` (`src/lib/product-page.ts`) gives the marked
  address to cards (and with them the cart and search suggestions), the gallery, related products,
  og:image and the JSON-LD; `photos()` stays for a banner's and a text block's photo.
- **The mark** is the wordmark (`src/lib/wordmark.ts`, shared with `Logo`) with its tagline, `#596653`
  at full strength, 46.1% of the photo's width, centred, its middle at 86.7% of the height — the
  numbers at which it lies exactly on the mockup's — and above the bottom edge on a photo much wider
  than tall. The photo is turned by its EXIF first.
- **`v1` in the path is the mark's version**: each marked photo is cached for a year, so another mark
  (or a newly traced wordmark) is `v2` in `MARKED_PHOTOS`.
- **A photo it cannot mark is a 502 with `no-store`**, logged, never the clean original: next/image
  would keep that for a year under the marked address.
- **The site password lets `GET /api/photo/…` through**, as it lets `/api/media/file/` through: these
  are the same public product photos. `next.config.ts` allows next/image the local `/api/photo/**`.

## Alternatives

- **Mark at upload, a copy beside the original**: a hook fetching the file back from Blob, a second
  file, a field, a migration, and a backfill of the photos already uploaded on Production by a
  button for the owner. Rejected: two files per photo that can drift apart, and a Production write.
- **Mark instead of the original**: no clean photo left for Google, and no way back.
- **A CSS overlay**: the client asks for the mark in the file.
- **A Next Route Handler outside `/api`**: next-intl would take it for a page.
- **The clean original when marking fails**: cached a year under the marked address.

## Consequences

- The first view of each photo is a function call (fetch and composite, up to about a second); after
  it the CDN and next/image's cache serve it. New addresses mean next/image optimizes each photo once
  more, counted once against Vercel Hobby's image limit.
- `sharp` is imported at the top of `src/lib/watermark.ts`, which `payload.config.ts` loads: its Linux
  binary is in every server function that loads the config, and a binary that fails to load takes
  them down with it, not only the endpoint.
- The clean originals stay at their Blob addresses and `/api/media` lists them to anyone: the mark
  stops «save image» on the storefront, not a reader of the API. Closing `/api/media` to staff is the
  task `media-api-staff-only`.
- Where the letters lie on the product, it does not show under them, as on the mockup; on a dark
  product the olive reads less well.
- Undone by a revert and a redeploy: nothing is written to Blob or the database.
