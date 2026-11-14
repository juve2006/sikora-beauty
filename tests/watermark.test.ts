import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SITE_URL } from '@/lib/constants';
import { productPhotos } from '@/lib/product-page';
import { markedPhoto, watermark } from '@/lib/watermark';

// The store's mark on product photos (tasks `photo-watermark`, `home-ui-fixes`), with the real sharp
// on a plain photo.

const white = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
    .png()
    .toBuffer();

// A grey backdrop, plain or shaded by `grey(x, y)`, with black rectangles on it: a third party's
// mark, the owner's product.
const backdrop = (
  width: number,
  height: number,
  blacks: { left: number; top: number; width: number; height: number }[],
  grey?: (x: number, y: number) => number,
) => {
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      data.set(
        grey ? Array(3).fill(Math.round(grey(x, y))) : [0xeb, 0xeb, 0xea],
        (y * width + x) * 3,
      );
  return sharp(data, { raw: { width, height, channels: 3 } })
    .composite(
      blacks.map(({ left, top, width, height }) => ({
        input: {
          create: { width, height, channels: 3, background: '#000000' },
        },
        left,
        top,
      })),
    )
    .png()
    .toBuffer();
};

// The mean of a part of the image, its first channel: the backdrops here are grey.
const mean = async (
  image: Buffer,
  region: { left: number; top: number; width: number; height: number },
) =>
  (await sharp(await sharp(image).extract(region).toBuffer()).stats())
    .channels[0].mean;

// The darkest value of any channel in a part of the image. Cut out first: `stats` reads the whole
// input, whatever the pipeline extracts.
const darkest = async (
  image: Buffer,
  region: { left: number; top: number; width: number; height: number },
) =>
  Math.min(
    ...(
      await sharp(await sharp(image).extract(region).toBuffer()).stats()
    ).channels
      .slice(0, 3)
      .map(({ min }) => min),
  );

// On a 400 × 600 photo: the mark 184 × 40 at x 108, y 525–565; cosmetika's mark covered at
// x 107–303, y 514–578; 79 px of backdrop on each side, for the card's 316 × 340.
const side = 79;
// Under the tagline of ours, where cosmetika's tagline stands.
const theirs = { left: 140, top: 567, width: 120, height: 6 };

describe('the mark', () => {
  it('stands where cosmetika’s mark stands, in the olive', async () => {
    const marked = await watermark(await white(400, 600));

    expect(await sharp(marked).metadata()).toMatchObject({
      format: 'webp',
      width: 400 + 2 * side,
      height: 600,
    });
    // 46.1% of the width, its middle at 90.75% of the height.
    const band = await darkest(marked, {
      left: side + 108,
      top: 525,
      width: 184,
      height: 40,
    });
    // The olive #596653 at full strength: its darkest channel is 0x53.
    expect(band).toBeLessThan(0x53 + 8);
    for (const clear of [
      { left: 0, top: 0, width: 558, height: 517 },
      { left: 0, top: 572, width: 558, height: 28 },
      { left: 0, top: 517, width: side + 100, height: 55 },
    ])
      expect(await darkest(marked, clear)).toBeGreaterThan(240);
  });

  it('covers cosmetika’s mark on a plain backdrop with the backdrop’s colour', async () => {
    const marked = await watermark(await backdrop(400, 600, [theirs]));

    expect(
      await darkest(marked, { ...theirs, left: side + theirs.left }),
    ).toBeGreaterThan(225);
  });

  it('leaves a busy photo as it is, where the owner’s product may stand', async () => {
    // A product across the patch's left side: a third of the ring is not the backdrop.
    const product = { left: 0, top: 480, width: 200, height: 120 };
    const marked = await watermark(
      await backdrop(400, 600, [product, { ...theirs, left: 220, width: 40 }]),
    );

    expect(
      await darkest(marked, {
        left: side + 220,
        top: 567,
        width: 40,
        height: 6,
      }),
    ).toBeLessThan(30);
  });

  it('shades the patch as the backdrop shades from its top to its foot', async () => {
    // 10 at the top to 250 at the foot: 30 levels across the ring, 10 between its middle and
    // cosmetika's tagline.
    const grey = (_: number, y: number) => 10 + 0.4 * y;
    const marked = await watermark(await backdrop(400, 600, [theirs], grey));

    const region = { ...theirs, left: side + theirs.left };
    expect(await darkest(marked, region)).toBeGreaterThan(225);
    expect(
      Math.abs((await mean(marked, region)) - grey(0, 569.5)),
    ).toBeLessThan(3);
  });

  it('leaves a shaded photo without a mark as it is', async () => {
    // 130 at the left to 230 at the right: plain enough a ring, and nothing under it to cover.
    const grey = (x: number) => 130 + x / 4;
    const marked = await watermark(await backdrop(400, 600, [], grey));

    // In the patch's straight part, under our mark.
    expect(
      Math.abs(
        (await mean(marked, {
          left: side + 150,
          top: 567,
          width: 10,
          height: 6,
        })) - grey(154.5),
      ),
    ).toBeLessThan(3);
  });

  it('carries the backdrop out to the card’s frame', async () => {
    const marked = await watermark(await backdrop(400, 600, []));

    // The grey #ebebea at the far edges, where the photo had none, within WebP's loss.
    for (const left of [0, 400 + 2 * side - 4]) {
      const { channels } = await sharp(
        await sharp(marked)
          .extract({ left, top: 0, width: 4, height: 600 })
          .toBuffer(),
      ).stats();
      for (const { min, max } of channels.slice(0, 3)) {
        expect(min).toBeGreaterThan(0xea - 4);
        expect(max).toBeLessThan(0xeb + 4);
      }
    }
  });

  it('keeps the whole mark on a photo much wider than tall, the frame above and below', async () => {
    const marked = await watermark(await white(1500, 300));

    // 1500 / (316 / 340) = 1614: 657 rows above the photo and below it.
    expect(await sharp(marked).metadata()).toMatchObject({
      width: 1500,
      height: 1614,
    });
    // The tagline, the mark's last line, on the photo's bottom rows: at 90.75% it would fall past
    // them, and sharp cuts off what does not fit.
    expect(
      await darkest(marked, {
        left: 650,
        top: 657 + 286,
        width: 200,
        height: 14,
      }),
    ).toBeLessThan(200);
  });

  it('turns a photo as its camera says before marking it', async () => {
    const sideways = await sharp(await white(400, 300))
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    // 300 × 400 once turned, and 36 px each side for the frame.
    expect(await sharp(await watermark(sideways)).metadata()).toMatchObject({
      width: 372,
      height: 400,
    });
  });
});

const payload = { findByID: vi.fn() };
const photo = {
  id: 7,
  filename: 'фото 1.jpg',
  url: 'https://store.public.blob.vercel-storage.com/a1b2/фото 1.jpg',
  mimeType: 'image/jpeg',
  alt: 'Сироватка',
};
const fetch = vi.fn();
const get = (id: string, filename: string) =>
  markedPhoto.handler({ payload, routeParams: { id, filename } } as never);

beforeEach(async () => {
  const original = await white(400, 300);
  payload.findByID.mockResolvedValue(photo);
  fetch.mockImplementation(async () => new Response(new Uint8Array(original)));
  vi.stubGlobal('fetch', fetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  payload.findByID.mockReset();
  fetch.mockReset();
});

describe('GET /api/photo/v2/:id/:filename', () => {
  it('marks the photo at its current file name and lets it be kept for a year', async () => {
    const response = await get('7', 'фото 1.jpg');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(
      await sharp(Buffer.from(await response.arrayBuffer())).metadata(),
    ).toMatchObject({ format: 'webp', width: 400, height: 430 });
    expect(payload.findByID).toHaveBeenCalledWith({
      collection: 'media',
      id: 7,
      depth: 0,
      disableErrors: true,
    });
    expect(fetch.mock.calls[0][0]).toEqual(new URL(photo.url));
  });

  it('answers no other address', async () => {
    expect((await get('7', 'фото 2.jpg')).status).toBe(404);
    expect((await get('7x', 'фото 1.jpg')).status).toBe(404);
    // Past Postgres `integer`: the database would throw rather than find nothing.
    expect((await get('2147483648', 'фото 1.jpg')).status).toBe(404);
    expect((await get('99999999999999999999', 'фото 1.jpg')).status).toBe(404);
    expect((await get('0', 'фото 1.jpg')).status).toBe(404);
    payload.findByID.mockResolvedValueOnce(null);
    expect((await get('8', 'фото 1.jpg')).status).toBe(404);
    payload.findByID.mockResolvedValueOnce({
      ...photo,
      mimeType: 'application/pdf',
    });
    expect((await get('7', 'фото 1.jpg')).status).toBe(404);
    expect(payload.findByID).toHaveBeenCalledTimes(3);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reads a photo kept on the local disk from this same app', async () => {
    payload.findByID.mockResolvedValue({
      ...photo,
      url: '/api/media/file/фото 1.jpg',
    });

    expect((await get('7', 'фото 1.jpg')).status).toBe(200);
    expect(fetch.mock.calls[0][0]).toEqual(
      new URL('/api/media/file/фото 1.jpg', SITE_URL),
    );
  });

  it('fails, uncached, rather than show the original unmarked', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetch.mockResolvedValueOnce(new Response(null, { status: 500 }));
    fetch.mockRejectedValueOnce(new Error('timeout'));
    fetch.mockResolvedValueOnce(new Response('not an image'));

    for (let i = 0; i < 3; i += 1) {
      const response = await get('7', 'фото 1.jpg');
      expect(response.status).toBe(502);
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
    expect(logged).toHaveBeenCalledTimes(3);
  });
});

describe('productPhotos', () => {
  it('shows a product photo only by its marked address', () => {
    expect(
      productPhotos([photo as never, 9, { ...photo, url: null } as never]),
    ).toEqual([
      {
        url: `/api/photo/v2/7/${encodeURIComponent('фото 1.jpg')}`,
        alt: 'Сироватка',
      },
    ]);
  });
});
