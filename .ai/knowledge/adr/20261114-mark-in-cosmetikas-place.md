---
id: adr-20261114-mark-in-cosmetikas-place
type: adr
status: accepted
date: 2026-11-14
domains:
  - catalog
  - storefront
paths:
  - src/lib/watermark.ts
  - src/components/shared/product/product-card.tsx
  - src/components/shared/product/no-photo.tsx
  - "src/app/*/(shop)/product/*/product-gallery.tsx"
summary: "v2 of the photo mark: ours where cosmetika's stood, a patch over theirs on a plain backdrop only, and the photo's backdrop copied out to the card's 316 × 340 frame"
reviewed_at: 2026-11-14
---
# A product photo's mark stands where cosmetika's stood and covers it, and the photo's backdrop is carried out to the card's frame

Refines adr-20261113-product-photos-marked-when-shown: the mark's place, a patch over cosmetika's
mark and the frame, as `v2` of `MARKED_PHOTOS`.

## Context

The photos the import brings from cosmetika.com.ua carry its mark, КОСМЕТИКА over КРАСА & ЗДОРОВ'Я,
across the foot of the podium, its middle at 90.75% of the height. `v1` put ours at 86.7%, just above
it, so a shopper saw both. cosmetika allowed the store to use its photos. The client's mockup card is
316 × 340, and a photo of 1414 × 2000 (0.707) in a square frame left bands of the card's colour at its
sides. On 2026-11-14 the developer decided: our mark only moves («Лише місце»), the photo's backdrop
is carried on («Продовжити фон фото»), and approved the prototype on photo 129. Task `home-ui-fixes`.

## Decision

- **The mark** is the same wordmark in the client's olive, 46.1% of the photo's width, centred, its
  middle now at 90.75% of the height: where cosmetika's stands. A photo much wider than tall keeps it
  above its bottom edge, as before.
- **Under it, a patch covers cosmetika's mark**: a pill over 26.8–75.7% of the width and 85.6–96.2%
  of the height, shaded from the median colour of the backdrop just above it to that just below it
  (239 to 229 on photo 129's podium), and feathered by 0.4% of the width. It is laid only where there
  is a mark on a plain backdrop. Plain: under a tenth of the pixels of a ring 1.2% of the width around
  it are transparent or further than 32 from the ring's median in a channel — photo 129 has 3% of them
  on its marble podium, and 15% turned upside down, with the product where the patch goes. A mark:
  pixels darker than that median by over 96 in every channel take at least a hundredth of the pill —
  14% on photo 129.
- **Then the photo is carried out to the frame**: its edge pixels copied outwards (sharp's `extend`
  with `copy`) to 316 : 340 — at the sides of a narrower photo, above and below a wider one. The
  storefront's `--aspect-photo` in `globals.css` is the same frame: the card, the gallery's photo and
  thumbnails and `NoPhoto` take it, the photos with `object-cover`.
- The photo keeps an alpha channel, so a cut-out PNG stays transparent, and so does what is added
  to it.
- `MARKED_PHOTOS` is `/photo/v2`: every marked photo is cached for a year.

## Alternatives

- **Our mark alone, cosmetika's left** — two marks on every imported photo.
- **A patch on every photo** — the owner's own photo may have its product there, and the patch would
  smear it.
- **A patch wherever the ring is plain, in one colour** — the review's case: a backdrop shaded within
  the ring's tolerance takes a flat pill with a step at its top and foot, on a photo that may have no
  mark to cover.
- **A field on `media`, «imported», to decide the patch** — a migration and a backfill of the photos
  on Production; the ring answers the same question with neither.
- **The bands filled in CSS** (a blurred copy, a colour from the photo) — only the card would change;
  the gallery, og:image and the JSON-LD would keep the bands, and the file is made anyway.
- **`object-cover` in the frame without extending** — cuts a quarter of a 0.707 photo's height,
  often the product's top or our mark.

## Consequences

- The thresholds were measured on one cosmetika photo; one whose ring is busy (a product standing
  over the mark, a patterned backdrop), or whose mark is light on a dark backdrop, keeps cosmetika's
  mark under ours. ponytail: the ring and letters test; a field on `media` when such photos turn up.
- An owner's photo with dark marks of its own at that place, on a plain backdrop, would lose them
  under the patch.
- A photo whose edge cuts through something shows it as streaks in the added backdrop.
- A marked photo is wider by the frame (1858 × 2000 from 1414 × 2000), and every photo has a new
  address: next/image optimizes each once more, counted against Vercel Hobby's image limit; the
  `v1` copies expire unused.
- Undone by a revert and a redeploy: nothing is written to Blob or the database.
