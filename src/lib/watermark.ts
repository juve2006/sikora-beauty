import type { Endpoint } from 'payload';
import sharp from 'sharp';

import { MARKED_PHOTOS, SITE_URL } from '@/lib/constants';
import { whatFailed } from '@/lib/utils';
import { markedPhotoParams } from '@/lib/validators';
import { wordmark } from '@/lib/wordmark';

// The store's mark on a product photo, as the client's mockup has it, made when the photo is shown:
// the original in Blob stays as it was uploaded, for the admin and for Merchant Center, which refuses
// a photo with a store's logo on it. The storefront shows a product's photos only through this
// endpoint (`productPhotos`); a banner's or a text block's photo has no mark. Not `server-only`:
// payload.config loads the endpoint.

// The client's olive at full strength, as on their mockup: an image file cannot read the theme's
// tokens. The mark is 46.1% of the photo's width, centred, its middle at 90.75% of the height: where
// the photos imported from cosmetika.com.ua carry its mark, which ours covers (they allowed us to). A
// photo much wider than tall keeps it above its bottom edge.
const svg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wordmark.width} ${wordmark.height.tagline}" fill="#596653">` +
    `<path fill-rule="evenodd" d="${wordmark.line}"/>` +
    `<path fill-rule="evenodd" transform="${wordmark.taglineAt}" d="${wordmark.tagline}"/></svg>`,
);

// The card's frame, as the mockup's (316 × 340), `--aspect-photo` in globals.css: a photo's backdrop
// is carried on to it, so a narrower photo leaves no bands of the card's colour at its sides.
const FRAME = 316 / 340;

// Where cosmetika's mark stands, with a margin, as shares of the photo.
const PATCH = { left: 0.268, top: 0.856, width: 0.489, height: 0.106 };

// cosmetika's mark covered by a patch of the backdrop around it, only where there is a mark on a
// plain backdrop: the ring around the patch differs from its median colour in under a tenth of its
// pixels (3% on cosmetika's podium, 15% with the product there), and dark letters take at least a
// hundredth of the patch (14% on photo 129). The owner's own photo may have its product there, which
// a patch would smear, or a shaded backdrop and no mark at all; a transparent pixel is no backdrop.
async function patch(data: Buffer, width: number, height: number) {
  const x = Math.round(width * PATCH.left);
  const y = Math.round(height * PATCH.top);
  const w = Math.round(width * PATCH.width);
  const h = Math.round(height * PATCH.height);
  const margin = Math.round(width * 0.012);
  const ring: number[] = [];
  const above: number[] = [];
  const below: number[] = [];
  for (
    let row = Math.max(0, y - margin);
    row < Math.min(height, y + h + margin);
    row++
  )
    for (let col = x - margin; col < x + w + margin; col++) {
      const i = (row * width + col) * 4;
      if (row < y) above.push(i);
      else if (row >= y + h) below.push(i);
      else if (col >= x && col < x + w) continue;
      ring.push(i);
    }
  const medianOf = (pixels: number[]) =>
    [0, 1, 2].map(
      (c) =>
        pixels.map((i) => data[i + c]).sort((a, b) => a - b)[
          pixels.length >> 1
        ],
    );
  const median = medianOf(ring);
  const far = ring.filter(
    (i) =>
      data[i + 3] < 255 ||
      median.some((value, c) => Math.abs(data[i + c] - value) > 32),
  ).length;
  if (far >= ring.length / 10) return [];
  let dark = 0;
  for (let row = y; row < y + h; row++)
    for (let col = x; col < x + w; col++) {
      const i = (row * width + col) * 4;
      if (median.every((value, c) => data[i + c] < value - 96)) dark++;
    }
  if (dark < (w * h) / 100) return [];
  // From the backdrop's colour above to its colour below, as a lit podium shades downwards (239 to
  // 229 on photo 129), and feathered, so its edge does not show.
  const [top, bottom] = [above, below].map((strip) =>
    strip.length ? medianOf(strip) : median,
  );
  const feather = Math.max(1, Math.round(width * 0.004));
  const rect = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w + 4 * feather}" height="${h + 4 * feather}">` +
      `<linearGradient id="shade" x2="0" y2="1"><stop stop-color="rgb(${top.join(',')})"/>` +
      `<stop offset="1" stop-color="rgb(${bottom.join(',')})"/></linearGradient>` +
      `<rect x="${2 * feather}" y="${2 * feather}" width="${w}" height="${h}" rx="${h / 2}" fill="url(#shade)"/></svg>`,
  );
  return [
    {
      input: await sharp(rect).blur(feather).png().toBuffer(),
      left: x - 2 * feather,
      top: y - 2 * feather,
    },
  ];
}

export async function watermark(original: Buffer) {
  // Turned as a camera's EXIF says first, so the mark lands where the shopper sees the bottom.
  const { data, info } = await sharp(original)
    .autoOrient()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const markWidth = Math.round(width * 0.461);
  // The paths drawn at the mark's own size, not scaled up from 72 dpi.
  const mark = await sharp(svg, {
    density: Math.max(1, (72 * markWidth) / wordmark.width),
  })
    .resize({ width: markWidth })
    .png()
    .toBuffer({ resolveWithObject: true });
  const marked = await sharp(data, { raw: info })
    .composite([
      ...(await patch(data, width, height)),
      {
        input: mark.data,
        left: Math.round((width - mark.info.width) / 2),
        top: Math.min(
          height - mark.info.height,
          Math.round(height * 0.9075 - mark.info.height / 2),
        ),
      },
    ])
    .raw()
    .toBuffer();
  // The edge pixels copied outwards to the frame: at the sides, or above and below a wider photo.
  const side = Math.max(0, Math.round((height * FRAME - width) / 2));
  const cap = Math.max(0, Math.round((width / FRAME - height) / 2));
  return sharp(marked, { raw: info })
    .extend({
      left: side,
      right: side,
      top: cap,
      bottom: cap,
      extendWith: 'copy',
    })
    .webp({ quality: 92 })
    .toBuffer();
}

// `GET /api/photo/v2/<id>/<filename>`. Only a photo's current file name answers, so there are no
// other addresses to make it work for. A photo it cannot mark is an error, not the original:
// next/image would keep that for a year under this address.
export const markedPhoto: Endpoint = {
  path: `${MARKED_PHOTOS}/:id/:filename`,
  method: 'get',
  handler: async (req) => {
    const params = markedPhotoParams.safeParse(req.routeParams);
    const media = params.success
      ? await req.payload.findByID({
          collection: 'media',
          id: params.data.id,
          depth: 0,
          disableErrors: true,
        })
      : null;
    if (
      !media?.url ||
      media.filename !== params.data?.filename ||
      !media.mimeType?.startsWith('image/')
    )
      return new Response(null, { status: 404 });
    try {
      // A photo kept on the local disk has a path, served by this same app.
      const original = await fetch(new URL(media.url, SITE_URL), {
        signal: AbortSignal.timeout(10_000),
      });
      if (!original.ok) throw new Error(`original: HTTP ${original.status}`);
      const marked = await watermark(Buffer.from(await original.arrayBuffer()));
      return new Response(new Uint8Array(marked), {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (error) {
      console.error('Watermark:', whatFailed(error));
      return new Response(null, {
        status: 502,
        headers: { 'Cache-Control': 'no-store' },
      });
    }
  },
};
