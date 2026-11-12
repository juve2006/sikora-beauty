import { readdirSync } from 'node:fs';
import type { Field, TextFieldSingleValidation } from 'payload';
import { describe, expect, it, vi } from 'vitest';

import { pageBlocks } from '@/collections/page-blocks';
import { Pages } from '@/collections/pages';
import { getMenu } from '@/lib/actions/category.actions';
import { RESERVED_SLUGS } from '@/lib/constants';
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
