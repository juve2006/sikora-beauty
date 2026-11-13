import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SITE_URL } from '@/lib/constants';
import { productPhotos } from '@/lib/product-page';
import { markedPhoto, watermark } from '@/lib/watermark';

// The store's mark on product photos (task `photo-watermark`), with the real sharp on a white photo.

const white = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
    .png()
    .toBuffer();

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

describe('the mark', () => {
  it('stands across the foot of the photo in the olive, as the mockup has it', async () => {
    const marked = await watermark(await white(400, 300));

    expect(await sharp(marked).metadata()).toMatchObject({
      format: 'webp',
      width: 400,
      height: 300,
    });
    // 46.1% of the width, its middle at 86.7% of the height: x 108–292, y 240–280.
    const band = await darkest(marked, {
      left: 108,
      top: 240,
      width: 184,
      height: 40,
    });
    // The olive #596653 at full strength: its darkest channel is 0x53.
    expect(band).toBeLessThan(0x53 + 8);
    for (const clear of [
      { left: 0, top: 0, width: 400, height: 232 },
      { left: 0, top: 286, width: 400, height: 14 },
      { left: 0, top: 232, width: 100, height: 54 },
    ])
      expect(await darkest(marked, clear)).toBeGreaterThan(240);
  });

  it('keeps the whole mark on a photo much wider than tall', async () => {
    const marked = await watermark(await white(1500, 300));

    expect(await sharp(marked).metadata()).toMatchObject({
      width: 1500,
      height: 300,
    });
    // The tagline, the mark's last line, on the photo's bottom rows: at 86.7% it would fall past
    // them, and sharp cuts off what does not fit.
    expect(
      await darkest(marked, { left: 650, top: 286, width: 200, height: 14 }),
    ).toBeLessThan(200);
  });

  it('turns a photo as its camera says before marking it', async () => {
    const sideways = await sharp(await white(400, 300))
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    expect(await sharp(await watermark(sideways)).metadata()).toMatchObject({
      width: 300,
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

describe('GET /api/photo/v1/:id/:filename', () => {
  it('marks the photo at its current file name and lets it be kept for a year', async () => {
    const response = await get('7', 'фото 1.jpg');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(
      await sharp(Buffer.from(await response.arrayBuffer())).metadata(),
    ).toMatchObject({ format: 'webp', width: 400, height: 300 });
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
        url: `/api/photo/v1/7/${encodeURIComponent('фото 1.jpg')}`,
        alt: 'Сироватка',
      },
    ]);
  });
});
