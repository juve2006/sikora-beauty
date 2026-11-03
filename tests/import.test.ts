import { describe, expect, it, vi } from 'vitest';

import type { PayloadRequest } from 'payload';

import {
  brandOf,
  decode,
  offerOf,
  toProduct,
  toText,
  volumeOf,
} from '@/lib/cosmetika';
import { cosmetikaProduct } from '@/lib/validators';
import { importEndpoints } from '@/collections/import-endpoints';
import { parseCsv, planPrices, toCsv } from '@/lib/prices';
import type { PricedProduct } from '@/types';

const terms = (brand: string, ...categories: string[]) => ({
  'wp:term': [
    [{ taxonomy: 'product_brand', name: brand }],
    categories.map((name) => ({ taxonomy: 'product_cat', name })),
  ],
});

const link = 'https://www.cosmetika.com.ua/shop/axatopic-cream/';
const source = {
  id: 17195,
  link,
  title: {
    rendered: 'Braderm Зволожувальна емульсія &#8211; Axatopic Cream, 250 ml',
  },
  content: {
    rendered: [
      '<h2>Braderm Axatopic Cream</h2>',
      '<p>Емульсія для сухої &amp; чутливої шкіри.</p>',
      '<h3>Основні властивості</h3>\n<ul>\n<li><strong>Зволоження:</strong> гліцерин.</li>\n<li>Цераміди.</li>\n</ul>',
      '<h3>Спосіб застосування</h3>\n<ol>\n<li>Нанесіть на шкіру.</li>\n</ol>',
      '<p><strong>Повний склад (INCI)</strong></p>\n<p>AQUA, GLYCERIN</p>',
      '<h3>Умови зберігання</h3><p>У сухому місці.</p>',
    ].join('\n'),
  },
  _embedded: terms('Braderm', 'Braderm', 'Креми, гелі для обличчя', 'ТІЛО'),
};

// A product's page, cut down to what the import reads: its JSON-LD and its gallery.
const photo = 'https://www.cosmetika.com.ua/wp-content/uploads/a.webp';
const productPage = ({
  prices = [{ price: '1650.00', priceCurrency: 'UAH' }] as object[],
  photos = [photo],
} = {}) =>
  `<script type="application/ld+json">{"@context":"https://schema.org/","@graph":[
    {"@type":"BreadcrumbList"},
    {"@type":"Product","offers":[{"@type":"Offer","priceSpecification":${JSON.stringify(prices)}}]}
  ]}</script>${photos.map((src) => `<div data-large_image="${src}"></div>`).join('')}`;

describe('cosmetika import', () => {
  it('turns its HTML into the plain text of our text areas', () => {
    expect(decode('Care &amp; Repair &#8211; it&#039;s &#x2019;')).toBe(
      "Care & Repair – it's ’",
    );
    expect(
      toText(
        '<h3>Кому</h3>\n<ul>\n<li>Сухій.</li>\n<li>Чутливій&nbsp;шкірі.</li>\n</ul>\n<p>Далі.</p>',
      ),
    ).toBe('Кому\n\n— Сухій.\n— Чутливій шкірі.\n\nДалі.');
  });

  it('reads the volume from the name', () => {
    expect(volumeOf('Instytutum Serum Next-Gen, 30 мл')).toEqual({
      volume: 30,
      volumeUnit: 'ml',
    });
    expect(volumeOf('Braderm Axatopic Gel, 500ml')).toEqual({
      volume: 500,
      volumeUnit: 'ml',
    });
    expect(volumeOf('SUNSCRIPTION SPF50, 10 мл')).toEqual({
      volume: 10,
      volumeUnit: 'ml',
    });
    expect(volumeOf('Маска 2 шт')).toEqual({ volume: 2, volumeUnit: 'pcs' });
    expect(volumeOf('Dr. Spiller Q10 Oxygen Complex')).toBeUndefined();
    expect(volumeOf('50 gel')).toBeUndefined();
  });

  it('takes only our three brands', () => {
    expect(brandOf({ _embedded: terms('Dr. Spiller') })).toBe('dr-spiller');
    expect(brandOf({ _embedded: terms('Instytutum') })).toBe('institutum');
    expect(brandOf({ _embedded: terms('Mesoestetic') })).toBeUndefined();
    // A category named after a brand does not make it one of ours.
    expect(
      brandOf({ _embedded: terms('Mesoestetic', 'Braderm') }),
    ).toBeUndefined();
    expect(brandOf({ name: 'no brands' })).toBeUndefined();
  });

  it('maps a product to our draft', () => {
    const product = toProduct(cosmetikaProduct.parse(source));
    expect(product).toMatchObject({
      name: 'Braderm Зволожувальна емульсія – Axatopic Cream, 250 ml',
      slug: 'braderm-zvolozhuvalna-emulsiia-axatopic-cream-250-ml',
      brand: 'braderm',
      categories: ['face-creams'],
      isSet: false,
      page: link,
      volume: 250,
      volumeUnit: 'ml',
      howToUse: '— Нанесіть на шкіру.',
      inci: 'AQUA, GLYCERIN',
      inciSource: link,
      warnings: ['Категорію «ТІЛО» не зіставлено'],
    });
    expect(product.purpose).toBe(
      'Braderm Axatopic Cream\n\nЕмульсія для сухої & чутливої шкіри.\n\nОсновні властивості\n\n' +
        '— Зволоження: гліцерин.\n— Цераміди.\n\nУмови зберігання\n\nУ сухому місці.',
    );
  });

  it('takes a paragraph labelled «СКЛАД» for INCI, as Instytutum’s pages have it', () => {
    for (const label of [
      '<strong>СКЛАД</strong>:',
      '<strong>Склад:</strong>',
    ]) {
      const product = toProduct(
        cosmetikaProduct.parse({
          ...source,
          content: {
            rendered: `<p>Крем.</p>\n<p>ОБ&#8217;ЄМ: 50 мл</p>\n<p>${label} AQUA, GLYCERIN.</p>`,
          },
        }),
      );
      expect(product).toMatchObject({
        purpose: 'Крем.\n\nОБ’ЄМ: 50 мл',
        inci: 'AQUA, GLYCERIN.',
        inciSource: link,
      });
    }
  });

  it('keeps INCI only with its source, and flags what the cosmetologist must fill', () => {
    const product = toProduct(
      cosmetikaProduct.parse({
        ...source,
        title: { rendered: 'Dr. Spiller Care &amp; Repair Cream' },
        content: { rendered: '<p>Склад: Комплекс POC, пантенол.</p>' },
        _embedded: terms(
          'Dr. Spiller',
          'Dr.Spiller',
          'Набори для догляду за обличчям',
        ),
      }),
    );
    expect(product).toMatchObject({
      inci: undefined,
      inciSource: undefined,
      isSet: true,
    });
    expect(product.purpose).toBe('Склад: Комплекс POC, пантенол.');
    expect(product.warnings).toEqual([
      'Без категорії: оберіть її вручну',
      "Об'єму немає в назві",
    ]);
  });

  it('refuses a product it cannot read', () => {
    for (const broken of [
      { title: { rendered: '' } },
      { link: 'not a url' },
      { link: 'https://elsewhere.example/shop/axatopic-cream/' },
      { content: {} },
      { _embedded: {} },
    ])
      expect(
        cosmetikaProduct.safeParse({ ...source, ...broken }).success,
        JSON.stringify(broken),
      ).toBe(false);
  });

  it('reads today’s price and the gallery from a product’s page', () => {
    expect(offerOf(productPage())).toEqual({
      price: 165000,
      images: [photo],
    });
    expect(
      offerOf(
        productPage({
          photos: [photo, `${photo}?a=1&#038;b=2`, photo],
        }),
      ).images,
    ).toEqual([photo, `${photo}?a=1&b=2`]);
    expect(offerOf(productPage({ photos: [] })).images).toEqual([]);
  });

  it('takes a sale’s price, not the list price beside it', () => {
    expect(
      offerOf(
        productPage({
          prices: [
            {
              price: '4200.00',
              priceCurrency: 'UAH',
              priceType: 'https://schema.org/ListPrice',
            },
            { price: '2900.00', priceCurrency: 'UAH' },
          ],
        }),
      ).price,
    ).toBe(290000);
  });

  it('passes over a block of JSON-LD it cannot read', () => {
    expect(
      offerOf(
        `<script type="application/ld+json">{ broken</script>${productPage()}`,
      ).price,
    ).toBe(165000);
  });

  it('refuses a page without a price in hryvnias', () => {
    for (const page of [
      '<html></html>',
      productPage({ prices: [] }),
      productPage({ prices: [{ price: '1650.00', priceCurrency: 'EUR' }] }),
      productPage({ prices: [{ price: '16.5', priceCurrency: 'UAH' }] }),
      productPage({
        prices: [
          {
            price: '1650.00',
            priceCurrency: 'UAH',
            priceType: 'https://schema.org/ListPrice',
          },
        ],
      }),
    ])
      expect(() => offerOf(page)).toThrow('ціну не прочитано');
  });

  // The server fetches what a page names, so a page never sends it elsewhere.
  it('refuses a photo off the store’s own address', () => {
    for (const photos of [
      ['https://elsewhere.example/a.webp'],
      ['http://www.cosmetika.com.ua/a.webp'],
      ['http://169.254.169.254/latest/meta-data/'],
      ['not a url'],
    ])
      expect(() => offerOf(productPage({ photos }))).toThrow(
        'незрозуміла адреса фото',
      );
  });
});

const products: PricedProduct[] = [
  {
    id: 1,
    slug: 'krem',
    name: 'Крем; "нічний"',
    brand: 'Braderm',
    volume: '50 мл',
    price: 165000,
    draft: false,
  },
  {
    id: 2,
    slug: 'tonik',
    name: 'Тонік',
    brand: 'Instytutum',
    volume: '',
    price: 122000,
    draft: true,
  },
  {
    id: 3,
    slug: 'maska',
    name: 'Маска',
    brand: 'Dr.Spiller',
    volume: '',
    price: null,
    draft: true,
  },
];

describe('prices in CSV', () => {
  it('writes every price in hryvnias for Excel', () => {
    expect(toCsv(products)).toBe(
      '﻿slug;name;brand;volume;price\r\n' +
        'krem;"Крем; ""нічний""";Braderm;50 мл;1650\r\n' +
        'tonik;Тонік;Instytutum;;1220\r\n' +
        'maska;Маска;Dr.Spiller;;\r\n',
    );
  });

  it('reads its own file back, and a comma-separated one', () => {
    expect(parseCsv(toCsv(products))[1]).toEqual([
      'krem',
      'Крем; "нічний"',
      'Braderm',
      '50 мл',
      '1650',
    ]);
    expect(
      parseCsv('slug,name,price\nkrem,"Крем, 50 мл","1 650,50"\n'),
    ).toEqual([
      ['slug', 'name', 'price'],
      ['krem', 'Крем, 50 мл', '1 650,50'],
    ]);
  });

  it('plans only the prices that change, in kopiyky', () => {
    const plan = planPrices(
      'slug;price\nkrem;1700,50\ntonik;1220\nmaska;99\n',
      products,
    );
    expect(plan).toEqual({
      changes: [
        {
          id: 1,
          slug: 'krem',
          name: 'Крем; "нічний"',
          from: 165000,
          to: 170050,
          draft: false,
        },
        {
          id: 3,
          slug: 'maska',
          name: 'Маска',
          from: null,
          to: 9900,
          draft: true,
        },
      ],
      errors: [],
    });
  });

  it('leaves an empty price cell and blank rows alone', () => {
    expect(planPrices('slug;name;price\nkrem;Крем;\n;;\n', products)).toEqual({
      changes: [],
      errors: [],
    });
  });

  it('names every row it cannot apply', () => {
    const plan = planPrices(
      'slug;price\nkrem;1700\nnemaie;100\nkrem;1800\ntonik;12.345\n;100\n',
      products,
    );
    expect(plan.errors).toEqual([
      { line: 3, message: 'Товару з адресою «nemaie» немає' },
      { line: 4, message: 'Товар «krem» уже є в рядку 2' },
      { line: 5, message: 'Ціна — не сума в гривнях, як 1245 або 1245,50' },
      { line: 6, message: 'Немає адреси товару (slug)' },
    ]);
  });

  it('refuses a file without its columns', () => {
    expect(planPrices('name;ціна\nКрем;1700\n', products).errors).toEqual([
      { line: 1, message: 'У першому рядку немає стовпців slug і price' },
    ]);
  });
});

describe('the import page', () => {
  it('answers only the owner: both tools write prices', async () => {
    for (const user of [
      null,
      { id: 2, collection: 'users', role: 'cosmetologist' },
    ]) {
      for (const endpoint of importEndpoints) {
        const response = await endpoint.handler({
          user,
        } as unknown as PayloadRequest);
        expect(response.status, `${endpoint.method} ${endpoint.path}`).toBe(
          403,
        );
      }
    }
  });

  it('creates a product whole or not at all, deleting the photos it uploaded', async () => {
    const importPortion = importEndpoints.find(
      (endpoint) =>
        endpoint.path === '/cosmetika' && endpoint.method === 'post',
    )!;
    const photos = [
      'https://www.cosmetika.com.ua/1.webp',
      'https://www.cosmetika.com.ua/2.webp',
    ];
    const failures = [
      { photoStatus: 404, save: true, deleted: [1] },
      { photoStatus: 200, save: false, deleted: [1, 2] },
    ];
    for (const { photoStatus, save, deleted } of failures) {
      let mediaId = 0;
      const removed: unknown[] = [];
      const names: string[] = [];
      vi.stubGlobal('fetch', async (url: string) =>
        url.includes('/wp-json/')
          ? Response.json([source])
          : url === link
            ? new Response(productPage({ photos }))
            : new Response('webp', {
                status: url.endsWith('2.webp') ? photoStatus : 200,
                headers: { 'Content-Type': 'image/webp' },
              }),
      );
      const payload = {
        find: async ({ collection }: { collection: string }) => ({
          docs: [
            {
              slug: collection === 'brands' ? 'braderm' : 'face-creams',
              id: 1,
            },
          ],
        }),
        count: async () => ({ totalDocs: 0 }),
        create: async ({
          collection,
          file,
        }: {
          collection: string;
          file?: { name: string };
        }) => {
          if (collection === 'media') {
            names.push(file!.name);
            return { id: ++mediaId };
          }
          if (save) return { id: 100 };
          throw new Error('save failed');
        },
        delete: async ({ where }: { where: unknown }) => removed.push(where),
      };
      const req = {
        user: { collection: 'users', role: 'owner' },
        payload,
        json: async () => ({ ids: [source.id] }),
      };
      const response = await importPortion.handler(
        req as unknown as PayloadRequest,
      );
      const { results } = await response.json();
      expect(results[0].status).toBe('failed');
      expect(removed).toEqual([{ id: { in: deleted } }]);
      // One Blob store serves every environment: a photo's name never repeats another run's.
      for (const name of names)
        expect(name).toMatch(
          /^braderm-zvolozhuvalna-emulsiia-axatopic-cream-250-ml-\d-[\da-f]{8}\.webp$/,
        );
    }
    vi.unstubAllGlobals();
  });

  const portion = (totalDocs: number) => {
    const created: string[] = [];
    return {
      created,
      req: {
        user: { collection: 'users', role: 'owner' },
        json: async () => ({ ids: [source.id] }),
        payload: {
          find: async () => ({ docs: [{ slug: 'braderm', id: 1 }] }),
          count: async () => ({ totalDocs }),
          create: async ({ collection }: { collection: string }) => {
            created.push(collection);
            return { id: created.length };
          },
        },
      } as unknown as PayloadRequest,
    };
  };
  const importHandler = importEndpoints.find(
    (endpoint) => endpoint.path === '/cosmetika' && endpoint.method === 'post',
  )!.handler;

  it('creates a draft at the page’s price, with the page as INCI’s source', async () => {
    const drafts: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', async (url: string) =>
      url.includes('/wp-json/')
        ? Response.json([source])
        : url === link
          ? new Response(productPage())
          : new Response('webp', {
              headers: { 'Content-Type': 'image/webp' },
            }),
    );
    const { req } = portion(0);
    const create = req.payload.create;
    req.payload.create = (async (args: {
      collection: string;
      data: Record<string, unknown>;
    }) => {
      if (args.collection === 'products') drafts.push(args.data);
      return create(args as never);
    }) as never;
    const { results } = await (await importHandler(req)).json();
    expect(results[0].status).toBe('created');
    expect(drafts[0]).toMatchObject({
      _status: 'draft',
      review: 'imported',
      price: 165000,
      images: [1],
      inciSource: link,
    });
    vi.unstubAllGlobals();
  });

  it('uploads nothing when a product’s page cannot be read', async () => {
    for (const [answer, message] of [
      [new Response('', { status: 403 }), 'сторінка товару відповіла 403'],
      [new Response('<html></html>'), 'ціну не прочитано'],
    ] as const) {
      vi.stubGlobal('fetch', async (url: string) =>
        url.includes('/wp-json/') ? Response.json([source]) : answer.clone(),
      );
      const { req, created } = portion(0);
      const { results } = await (await importHandler(req)).json();
      expect(results[0]).toMatchObject({ status: 'failed', message });
      expect(created).toEqual([]);
    }
    vi.unstubAllGlobals();
  });

  it('reads no page of a product it already has', async () => {
    const asked: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      asked.push(url);
      return Response.json([source]);
    });
    const { req, created } = portion(1);
    const { results } = await (await importHandler(req)).json();
    expect(results[0].status).toBe('skipped');
    expect(created).toEqual([]);
    expect(asked.every((url) => url.includes('/wp-json/'))).toBe(true);
    vi.unstubAllGlobals();
  });

  it('lists our brands’ products without their pages, asking for the terms it reads and refusing a redirect', async () => {
    const plan = importEndpoints.find(
      (endpoint) => endpoint.path === '/cosmetika' && endpoint.method === 'get',
    )!;
    const asked: string[] = [];
    const redirects: unknown[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      asked.push(url);
      redirects.push(init.redirect);
      return Response.json(
        [source, { ...source, id: 2, _embedded: terms('Mesoestetic') }],
        { headers: { 'X-WP-TotalPages': '1' } },
      );
    });
    const response = await plan.handler({
      user: { collection: 'users', role: 'owner' },
      payload: {
        find: async () => ({
          docs: ['dr-spiller', 'institutum', 'braderm'].map((slug, id) => ({
            slug,
            id,
          })),
        }),
      },
    } as unknown as PayloadRequest);
    const { products, errors } = await response.json();
    expect(errors).toEqual([]);
    expect(products).toEqual([
      expect.objectContaining({ id: source.id, exists: false }),
    ]);
    expect(asked).toHaveLength(1);
    expect(asked[0]).toContain(
      'https://www.cosmetika.com.ua/wp-json/wp/v2/product?',
    );
    expect(asked[0]).toContain('_embed=wp:term');
    expect(redirects).toEqual(['error']);
    vi.unstubAllGlobals();
  });

  it('stops with a message when cosmetika answers what it cannot read', async () => {
    const plan = importEndpoints.find(
      (endpoint) => endpoint.path === '/cosmetika' && endpoint.method === 'get',
    )!;
    const payload = {
      find: async () => ({
        docs: ['dr-spiller', 'institutum', 'braderm'].map((slug, id) => ({
          slug,
          id,
        })),
      }),
    };
    for (const pages of ['abc', '9999']) {
      vi.stubGlobal('fetch', async () =>
        Response.json([source], { headers: { 'X-WP-TotalPages': pages } }),
      );
      const response = await plan.handler({
        user: { collection: 'users', role: 'owner' },
        payload,
      } as unknown as PayloadRequest);
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({
        error: 'cosmetika.com.ua: незрозуміла відповідь',
      });
    }
    vi.unstubAllGlobals();
  });
});
