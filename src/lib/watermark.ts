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
// tokens. The mark is 46.1% of the photo's width, its middle at 86.7% of the height: at the foot of
// the product, where it lies exactly on the mockup's. A photo much wider than tall keeps it above its
// bottom edge.
const svg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wordmark.width} ${wordmark.height.tagline}" fill="#596653">` +
    `<path fill-rule="evenodd" d="${wordmark.line}"/>` +
    `<path fill-rule="evenodd" transform="${wordmark.taglineAt}" d="${wordmark.tagline}"/></svg>`,
);

export async function watermark(original: Buffer) {
  // Turned as a camera's EXIF says first, so the mark lands where the shopper sees the bottom.
  const { data, info } = await sharp(original)
    .autoOrient()
    .toBuffer({ resolveWithObject: true });
  const width = Math.round(info.width * 0.461);
  // The paths drawn at the mark's own size, not scaled up from 72 dpi.
  const mark = await sharp(svg, {
    density: Math.max(1, (72 * width) / wordmark.width),
  })
    .resize({ width })
    .png()
    .toBuffer({ resolveWithObject: true });
  return sharp(data)
    .composite([
      {
        input: mark.data,
        left: Math.round((info.width - mark.info.width) / 2),
        top: Math.min(
          info.height - mark.info.height,
          Math.round(info.height * 0.867 - mark.info.height / 2),
        ),
      },
    ])
    .webp({ quality: 92 })
    .toBuffer();
}

// `GET /api/photo/v1/<id>/<filename>`. Only a photo's current file name answers, so there are no
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
