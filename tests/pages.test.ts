import { readdirSync } from 'node:fs';
import type { Field, TextFieldSingleValidation } from 'payload';
import { describe, expect, it, vi } from 'vitest';

import { pageBlocks } from '@/collections/page-blocks';
import { Pages } from '@/collections/pages';
import { datePublished } from '@/collections/posts';
import { getBrand, getBrands, getMenu } from '@/lib/actions/category.actions';
import { getPost, getPosts } from '@/lib/actions/post.actions';
import { POSTS_PAGE_SIZE, RESERVED_SLUGS } from '@/lib/constants';
import { adminSession, internalPath } from '@/lib/validators';

vi.mock('server-only', () => ({}));
vi.mock('@payload-config', () => ({ default: {} }));

const payload = { find: vi.fn() };
vi.mock('payload', async (original) => ({
  ...(await original<typeof import('payload')>()),
  getPayload: async () => payload,
}));

const validate = (fields: Field[], name: string) =>
  (
    fields.find((field) => 'name' in field && field.name === name) as {
      validate: TextFieldSingleValidation;
    }
  ).validate;
const check = (rule: TextFieldSingleValidation, value: string) =>
  rule(value, {} as never);

describe('a page', () => {
  // A section's route would hide a page with its name.
  it('cannot take a storefront section as its address', () => {
    const sections = readdirSync('src/app/[locale]/(shop)', {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('['))
      .map((entry) => entry.name);
    expect(sections.length).toBeGreaterThan(0);
    expect(RESERVED_SLUGS).toEqual(expect.arrayContaining(sections));
    const slug = validate(Pages.fields, 'slug');
    for (const reserved of [...sections, 'admin', 'api', 'en', 'uk'])
      expect(check(slug, reserved)).toBeTypeOf('string');
    for (const free of ['home', 'about', 'delivery'])
      expect(check(slug, free)).toBe(true);
  });

  it.each(['/', '/catalog/face', '/collection/new?page=2', '/en/about'])(
    'links its button to %s on this store',
    (path) => {
      expect(internalPath.safeParse(path).success).toBe(true);
    },
  );

  it.each([
    'https://example.com',
    '//example.com',
    '/\\example.com',
    'javascript:alert(1)',
    'catalog/face',
    '/catalog face',
  ])('never links its button to %s', (path) => {
    expect(internalPath.safeParse(path).success).toBe(false);
    const hero = pageBlocks.find(({ slug }) => slug === 'hero')!;
    const row = hero.fields.find((field) => field.type === 'row')!;
    expect(
      check(validate((row as { fields: Field[] }).fields, 'buttonLink'), path),
    ).toBeTypeOf('string');
  });
});

describe('the admin link', () => {
  it('shows only for a signed-in role', () => {
    const shown = (body: unknown) =>
      Boolean(adminSession.safeParse(body).data?.user);
    expect(shown({ user: { id: 1, role: 'owner' } })).toBe(true);
    expect(shown({ user: { id: 2, role: 'cosmetologist' } })).toBe(true);
    expect(shown({ user: null, message: 'Account' })).toBe(false);
    expect(shown({ user: { id: 3 } })).toBe(false);
    expect(shown('<html>')).toBe(false);
  });
});

describe('the menu', () => {
  it('puts each category under its zone, in the admin order, and marks a zone for the menu', async () => {
    payload.find.mockImplementation(async ({ collection }) => ({
      docs:
        collection === 'categories'
          ? [
              { id: 1, title: 'Обличчя', slug: 'face', parent: null },
              { id: 2, title: 'Сироватки', slug: 'face-serums', parent: 1 },
              {
                id: 3,
                title: 'Тіло',
                slug: 'body',
                parent: null,
                menuItem: true,
              },
              { id: 4, title: 'Креми', slug: 'face-creams', parent: 1 },
              { id: 5, title: 'Без адреси', slug: null, parent: 3 },
            ]
          : [{ id: 1, title: 'Зневоднення', slug: 'dehydration' }],
    }));
    expect(await getMenu('uk')).toEqual({
      zones: [
        {
          slug: 'face',
          title: 'Обличчя',
          menuItem: false,
          categories: [
            { slug: 'face-serums', title: 'Сироватки' },
            { slug: 'face-creams', title: 'Креми' },
          ],
        },
        { slug: 'body', title: 'Тіло', menuItem: true, categories: [] },
      ],
      concerns: [{ slug: 'dehydration', title: 'Зневоднення' }],
    });
    // What anonymous shoppers may see, in the admin's order.
    for (const [query] of payload.find.mock.calls)
      expect(query).toMatchObject({ overrideAccess: false, sort: '_order' });
  });
});

describe('the brands', () => {
  it('are those with a published product, by name, each with its logo or none', async () => {
    payload.find.mockReset();
    payload.find.mockImplementation(async ({ collection }) => ({
      docs:
        collection === 'products'
          ? [{ brand: 2 }, { brand: 1 }, { brand: 2 }, { brand: null }]
          : [
              {
                id: 1,
                name: 'Dr.Spiller',
                slug: 'dr-spiller',
                logo: { url: '/api/media/file/spiller.svg' },
              },
              { id: 2, name: 'Innoaesthetics', slug: 'inno', logo: null },
              { id: 3, name: 'Me line', slug: 'me-line', logo: null },
              { id: 4, name: 'Без адреси', slug: null, logo: null },
            ],
    }));
    expect(await getBrands('uk')).toEqual([
      {
        slug: 'dr-spiller',
        title: 'Dr.Spiller',
        logo: '/api/media/file/spiller.svg',
      },
      { slug: 'inno', title: 'Innoaesthetics', logo: null },
    ]);
    // What anonymous shoppers may see: a draft's brand is no brand to buy.
    for (const [query] of payload.find.mock.calls)
      expect(query).toMatchObject({ overrideAccess: false });
  });

  it('give a brand page its logo', async () => {
    payload.find.mockReset();
    payload.find.mockResolvedValue({
      docs: [
        {
          id: 1,
          name: 'Dr.Spiller',
          slug: 'dr-spiller',
          logo: { url: '/api/media/file/spiller.svg' },
        },
      ],
    });
    expect(await getBrand('dr-spiller', 'uk')).toEqual({
      id: 1,
      title: 'Dr.Spiller',
      logo: '/api/media/file/spiller.svg',
    });
    payload.find.mockResolvedValue({ docs: [] });
    expect(await getBrand('none', 'uk')).toBeNull();
  });
});

describe('a post', () => {
  const day = '2026-01-01T00:00:00.000Z';
  const change = (data: object, originalDoc?: object) =>
    datePublished({ data, originalDoc } as never);

  it('takes the day it is published on, unless it has one', () => {
    const before = Date.now();
    const published = change({ _status: 'published' });
    expect(Date.parse(published.publishedAt)).toBeGreaterThanOrEqual(before);
    // Cleared on publishing, it takes the day again.
    expect(
      change({ _status: 'published', publishedAt: null }, { publishedAt: day })
        .publishedAt,
    ).toBeTypeOf('string');
    expect(change({ _status: 'published', publishedAt: day })).toEqual({
      _status: 'published',
      publishedAt: day,
    });
    // An update that does not send the day keeps the stored one.
    expect(change({ _status: 'published' }, { publishedAt: day })).toEqual({
      _status: 'published',
    });
    expect(change({ _status: 'draft' })).toEqual({ _status: 'draft' });
  });

  it('is read published, as anonymous shoppers may see it, the newest first', async () => {
    payload.find.mockReset();
    payload.find.mockResolvedValue({ docs: [], totalPages: 0 });
    await getPosts('uk', 2);
    expect(payload.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        collection: 'posts',
        sort: '-publishedAt',
        page: 2,
        limit: POSTS_PAGE_SIZE,
      }),
    );
    expect(await getPost('first', 'en')).toBeNull();
    expect(payload.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        collection: 'posts',
        where: { slug: { equals: 'first' } },
        locale: 'en',
      }),
    );
    for (const [query] of payload.find.mock.calls)
      expect(query).toMatchObject({ overrideAccess: false });
  });
});
