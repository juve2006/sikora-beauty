import { describe, expect, it, vi } from 'vitest'

import type { PayloadRequest } from 'payload'

import { brandOf, cosmetikaProduct, decode, toProduct, toText, volumeOf } from '@/lib/cosmetika'
import { importEndpoints } from '@/collections/import-endpoints'
import { parseCsv, planPrices, type PricedProduct, toCsv } from '@/lib/prices'

const source = {
  id: 17195,
  name: 'Braderm Зволожувальна емульсія &#8211; Axatopic Cream, 250 ml',
  permalink: 'https://cosmetika.com.ua/product/axatopic-cream/',
  description: [
    '<h2>Braderm Axatopic Cream</h2>',
    '<p>Емульсія для сухої &amp; чутливої шкіри.</p>',
    '<h3>Основні властивості</h3>\n<ul>\n<li><strong>Зволоження:</strong> гліцерин.</li>\n<li>Цераміди.</li>\n</ul>',
    '<h3>Спосіб застосування</h3>\n<ol>\n<li>Нанесіть на шкіру.</li>\n</ol>',
    '<p><strong>Повний склад (INCI)</strong></p>\n<p>AQUA, GLYCERIN</p>',
    '<h3>Умови зберігання</h3><p>У сухому місці.</p>',
  ].join('\n'),
  prices: { price: '165000', currency_code: 'UAH', currency_minor_unit: 2 },
  images: [{ src: 'https://cosmetika.com.ua/wp-content/uploads/a.webp' }],
  categories: [{ name: 'Braderm' }, { name: 'Креми, гелі для обличчя' }, { name: 'ТІЛО' }],
  brands: [{ name: 'Braderm' }],
}

describe('cosmetika import', () => {
  it('turns its HTML into the plain text of our text areas', () => {
    expect(decode('Care &amp; Repair &#8211; it&#039;s &#x2019;')).toBe('Care & Repair – it\'s ’')
    expect(toText('<h3>Кому</h3>\n<ul>\n<li>Сухій.</li>\n<li>Чутливій&nbsp;шкірі.</li>\n</ul>\n<p>Далі.</p>')).toBe(
      'Кому\n\n— Сухій.\n— Чутливій шкірі.\n\nДалі.',
    )
  })

  it('reads the volume from the name', () => {
    expect(volumeOf('Instytutum Serum Next-Gen, 30 мл')).toEqual({ volume: 30, volumeUnit: 'ml' })
    expect(volumeOf('Braderm Axatopic Gel, 500ml')).toEqual({ volume: 500, volumeUnit: 'ml' })
    expect(volumeOf('SUNSCRIPTION SPF50, 10 мл')).toEqual({ volume: 10, volumeUnit: 'ml' })
    expect(volumeOf('Маска 2 шт')).toEqual({ volume: 2, volumeUnit: 'pcs' })
    expect(volumeOf('Dr. Spiller Q10 Oxygen Complex')).toBeUndefined()
    expect(volumeOf('50 gel')).toBeUndefined()
  })

  it('takes only our three brands', () => {
    expect(brandOf({ brands: [{ name: 'Dr. Spiller' }] })).toBe('dr-spiller')
    expect(brandOf({ brands: [{ name: 'Instytutum' }] })).toBe('institutum')
    expect(brandOf({ brands: [{ name: 'Mesoestetic' }] })).toBeUndefined()
    expect(brandOf({ name: 'no brands' })).toBeUndefined()
  })

  it('maps a product to our draft', () => {
    const product = toProduct(cosmetikaProduct.parse(source))
    expect(product).toMatchObject({
      name: 'Braderm Зволожувальна емульсія – Axatopic Cream, 250 ml',
      slug: 'braderm-zvolozhuvalna-emulsiia-axatopic-cream-250-ml',
      brand: 'braderm',
      categories: ['face-creams'],
      isSet: false,
      price: 165000,
      volume: 250,
      volumeUnit: 'ml',
      howToUse: '— Нанесіть на шкіру.',
      inci: 'AQUA, GLYCERIN',
      inciSource: 'https://cosmetika.com.ua/product/axatopic-cream/',
      images: ['https://cosmetika.com.ua/wp-content/uploads/a.webp'],
      warnings: ['Категорію «ТІЛО» не зіставлено'],
    })
    expect(product.purpose).toBe(
      'Braderm Axatopic Cream\n\nЕмульсія для сухої & чутливої шкіри.\n\nОсновні властивості\n\n' +
        '— Зволоження: гліцерин.\n— Цераміди.\n\nУмови зберігання\n\nУ сухому місці.',
    )
  })

  it('keeps INCI only with its source, and flags what the cosmetologist must fill', () => {
    const product = toProduct(
      cosmetikaProduct.parse({
        ...source,
        name: 'Dr. Spiller Care &amp; Repair Cream',
        description: '<p>Склад: Комплекс POC, пантенол.</p>',
        categories: [{ name: 'Dr.Spiller' }, { name: 'Набори для догляду за обличчям' }],
      }),
    )
    expect(product).toMatchObject({ inci: undefined, inciSource: undefined, isSet: true })
    expect(product.purpose).toBe('Склад: Комплекс POC, пантенол.')
    expect(product.warnings).toEqual(['Без категорії: оберіть її вручну', "Об'єму немає в назві"])
  })

  it('refuses a product it cannot read', () => {
    expect(cosmetikaProduct.safeParse({ ...source, prices: { ...source.prices, price: '16.50' } }).success).toBe(false)
    expect(cosmetikaProduct.safeParse({ ...source, prices: { ...source.prices, currency_code: 'EUR' } }).success).toBe(false)
    expect(cosmetikaProduct.safeParse({ ...source, images: [{ src: 'not a url' }] }).success).toBe(false)
  })
})

const products: PricedProduct[] = [
  { id: 1, slug: 'krem', name: 'Крем; "нічний"', brand: 'Braderm', volume: '50 мл', price: 165000, draft: false },
  { id: 2, slug: 'tonik', name: 'Тонік', brand: 'Instytutum', volume: '', price: 122000, draft: true },
  { id: 3, slug: 'maska', name: 'Маска', brand: 'Dr.Spiller', volume: '', price: null, draft: true },
]

describe('prices in CSV', () => {
  it('writes every price in hryvnias for Excel', () => {
    expect(toCsv(products)).toBe(
      '﻿slug;name;brand;volume;price\r\n' +
        'krem;"Крем; ""нічний""";Braderm;50 мл;1650\r\n' +
        'tonik;Тонік;Instytutum;;1220\r\n' +
        'maska;Маска;Dr.Spiller;;\r\n',
    )
  })

  it('reads its own file back, and a comma-separated one', () => {
    expect(parseCsv(toCsv(products))[1]).toEqual(['krem', 'Крем; "нічний"', 'Braderm', '50 мл', '1650'])
    expect(parseCsv('slug,name,price\nkrem,"Крем, 50 мл","1 650,50"\n')).toEqual([
      ['slug', 'name', 'price'],
      ['krem', 'Крем, 50 мл', '1 650,50'],
    ])
  })

  it('plans only the prices that change, in kopiyky', () => {
    const plan = planPrices('slug;price\nkrem;1700,50\ntonik;1220\nmaska;99\n', products)
    expect(plan).toEqual({
      changes: [
        { id: 1, slug: 'krem', name: 'Крем; "нічний"', from: 165000, to: 170050, draft: false },
        { id: 3, slug: 'maska', name: 'Маска', from: null, to: 9900, draft: true },
      ],
      errors: [],
    })
  })

  it('leaves an empty price cell and blank rows alone', () => {
    expect(planPrices('slug;name;price\nkrem;Крем;\n;;\n', products)).toEqual({ changes: [], errors: [] })
  })

  it('names every row it cannot apply', () => {
    const plan = planPrices('slug;price\nkrem;1700\nnemaie;100\nkrem;1800\ntonik;12.345\n;100\n', products)
    expect(plan.errors).toEqual([
      { line: 3, message: 'Товару з адресою «nemaie» немає' },
      { line: 4, message: 'Товар «krem» уже є в рядку 2' },
      { line: 5, message: 'Ціна — не сума в гривнях, як 1245 або 1245,50' },
      { line: 6, message: 'Немає адреси товару (slug)' },
    ])
  })

  it('refuses a file without its columns', () => {
    expect(planPrices('name;ціна\nКрем;1700\n', products).errors).toEqual([
      { line: 1, message: 'У першому рядку немає стовпців slug і price' },
    ])
  })
})

describe('the import page', () => {
  it('answers only the owner: both tools write prices', async () => {
    for (const user of [null, { id: 2, role: 'cosmetologist' }]) {
      for (const endpoint of importEndpoints) {
        const response = await endpoint.handler({ user } as unknown as PayloadRequest)
        expect(response.status, `${endpoint.method} ${endpoint.path}`).toBe(403)
      }
    }
  })

  it('creates a product whole or not at all, deleting the photos it uploaded', async () => {
    const importPortion = importEndpoints.find((endpoint) => endpoint.path === '/cosmetika' && endpoint.method === 'post')!
    const photos = [{ src: 'https://cosmetika.com.ua/1.webp' }, { src: 'https://cosmetika.com.ua/2.webp' }]
    const failures = [
      { photo: 404, save: true, deleted: [1] },
      { photo: 200, save: false, deleted: [1, 2] },
    ]
    for (const { photo, save, deleted } of failures) {
      let mediaId = 0
      const removed: unknown[] = []
      const names: string[] = []
      vi.stubGlobal('fetch', async (url: string) =>
        url.startsWith('https://cosmetika.com.ua/wp-json')
          ? Response.json([{ ...source, images: photos }])
          : new Response('webp', { status: url.endsWith('2.webp') ? photo : 200, headers: { 'Content-Type': 'image/webp' } }),
      )
      const payload = {
        find: async ({ collection }: { collection: string }) => ({ docs: [{ slug: collection === 'brands' ? 'braderm' : 'face-creams', id: 1 }] }),
        count: async () => ({ totalDocs: 0 }),
        create: async ({ collection, file }: { collection: string; file?: { name: string } }) => {
          if (collection === 'media') {
            names.push(file!.name)
            return { id: ++mediaId }
          }
          if (save) return { id: 100 }
          throw new Error('save failed')
        },
        delete: async ({ where }: { where: unknown }) => removed.push(where),
      }
      const req = { user: { role: 'owner' }, payload, json: async () => ({ ids: [source.id] }) }
      const response = await importPortion.handler(req as unknown as PayloadRequest)
      const { results } = await response.json()
      expect(results[0].status).toBe('failed')
      expect(removed).toEqual([{ id: { in: deleted } }])
      // One Blob store serves every environment: a photo's name never repeats another run's.
      for (const name of names) expect(name).toMatch(/^braderm-zvolozhuvalna-emulsiia-axatopic-cream-250-ml-\d-[\da-f]{8}\.webp$/)
    }
    vi.unstubAllGlobals()
  })

  it('stops with a message when cosmetika answers what it cannot read', async () => {
    const plan = importEndpoints.find((endpoint) => endpoint.path === '/cosmetika' && endpoint.method === 'get')!
    const payload = { find: async () => ({ docs: ['dr-spiller', 'institutum', 'braderm'].map((slug, id) => ({ slug, id })) }) }
    for (const pages of ['abc', '9999']) {
      vi.stubGlobal('fetch', async () => Response.json([source], { headers: { 'X-WP-TotalPages': pages } }))
      const response = await plan.handler({ user: { role: 'owner' }, payload } as unknown as PayloadRequest)
      expect(response.status).toBe(502)
      expect(await response.json()).toEqual({ error: 'cosmetika.com.ua: незрозуміла відповідь' })
    }
    vi.unstubAllGlobals()
  })
})
