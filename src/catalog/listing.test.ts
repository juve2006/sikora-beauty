import { describe, expect, it } from 'vitest'

import { type Facet, listing, listingParams, type ListingProduct, listingSearch, toggled } from './listing'

const product = (id: number, terms: Partial<ListingProduct['terms']>, more: Partial<ListingProduct> = {}): ListingProduct => ({
  id,
  price: 100000,
  availability: 'in_stock',
  createdAt: `2026-10-${String(id).padStart(2, '0')}T00:00:00.000Z`,
  terms: { type: [], condition: [], concern: [], brand: [], ...terms },
  ...more,
})

const facets: Facet[] = [
  { key: 'type', values: [{ slug: 'dry', title: 'Суха' }, { slug: 'oily', title: 'Жирна' }, { slug: 'normal', title: 'Нормальна' }] },
  { key: 'concern', values: [{ slug: 'acne', title: 'Акне' }] },
  { key: 'brand', values: [{ slug: 'braderm', title: 'Braderm' }, { slug: 'institutum', title: 'Institutum' }] },
]

const products = [
  product(1, { type: ['dry'], brand: ['braderm'] }),
  product(2, { type: ['oily'], concern: ['acne'], brand: ['braderm'] }),
  product(3, { type: ['dry', 'oily'], brand: ['institutum'] }),
  product(4, { brand: ['institutum'] }),
]

const params = (query: Record<string, string | string[]>) => listingParams.parse(query)
const ids = (result: ReturnType<typeof listing>) => result.products.map((item) => item.id)

describe('listingParams', () => {
  it('reads slugs separated by commas or repeated', () => {
    expect(params({ type: 'dry,oily', brand: ['braderm', 'institutum'] })).toMatchObject({
      type: ['dry', 'oily'],
      brand: ['braderm', 'institutum'],
      condition: [],
      page: 1,
    })
  })

  it('drops what is not a slug, a sort or a page instead of failing', () => {
    expect(params({ type: 'dry,<script>,,DRY', sort: 'cheapest', page: 'abc' })).toEqual({
      type: ['dry'],
      condition: [],
      concern: [],
      brand: [],
      sort: undefined,
      page: 1,
    })
    expect(params({ page: '0' }).page).toBe(1)
    expect(params({ page: '2.5' }).page).toBe(1)
    expect(params({ page: ['3', '4'], sort: 'price-desc' })).toMatchObject({ page: 3, sort: 'price-desc' })
  })
})

describe('listing', () => {
  it('matches any value within a facet and every facet across', () => {
    expect(ids(listing(products, facets, params({ type: 'dry,oily' })))).toEqual([3, 2, 1])
    expect(ids(listing(products, facets, params({ type: 'dry,oily', brand: 'braderm' })))).toEqual([2, 1])
  })

  it('counts each value under the other facets, not its own', () => {
    const result = listing(products, facets, params({ type: 'dry', brand: 'institutum' }))
    expect(result.facets).toEqual([
      {
        key: 'type',
        values: [
          { slug: 'dry', title: 'Суха', count: 1, selected: true },
          { slug: 'oily', title: 'Жирна', count: 1, selected: false },
        ],
      },
      {
        key: 'brand',
        values: [
          { slug: 'braderm', title: 'Braderm', count: 1, selected: false },
          { slug: 'institutum', title: 'Institutum', count: 1, selected: true },
        ],
      },
    ])
    expect(result.selected).toBe(2)
  })

  it('keeps a selected value with nothing left, and forgets one that does not exist', () => {
    const result = listing(products, facets, params({ concern: 'acne', brand: 'institutum,unknown' }))
    expect(result.total).toBe(0)
    expect(result.facets.find((facet) => facet.key === 'concern')?.values).toEqual([
      { slug: 'acne', title: 'Акне', count: 0, selected: true },
    ])
    expect(result.selected).toBe(2)
  })

  it('puts what is in stock first, newest first, unless asked otherwise', () => {
    const shelf = [
      product(1, {}, { availability: 'out_of_stock', price: 500 }),
      product(2, {}, { availability: 'made_to_order', price: 300 }),
      product(3, {}, { price: 900 }),
      product(4, {}, { price: 100 }),
    ]
    expect(ids(listing(shelf, facets, params({})))).toEqual([4, 3, 2, 1])
    expect(ids(listing(shelf, facets, params({ sort: 'price-asc' })))).toEqual([4, 2, 1, 3])
    expect(ids(listing(shelf, facets, params({ sort: 'price-desc' })))).toEqual([3, 1, 2, 4])
    expect(ids(listing(shelf, facets, params({ sort: 'new' })))).toEqual([4, 3, 2, 1])
  })

  it('writes a changed list back into its URL, from the first page', () => {
    const current = params({ type: 'dry', brand: 'braderm', sort: 'new', page: '3' })
    expect(listingSearch(current, { type: toggled(current.type, 'oily') })).toBe('?type=dry,oily&brand=braderm&sort=new')
    expect(listingSearch(current, { type: toggled(current.type, 'dry') })).toBe('?brand=braderm&sort=new')
    expect(listingSearch(current, { page: 2 })).toBe('?type=dry&brand=braderm&sort=new&page=2')
    expect(listingSearch(params({}), {})).toBe('')
  })

  it('shows 24 a page', () => {
    const many = Array.from({ length: 30 }, (_, index) => product(index + 1, {}))
    expect(listing(many, facets, params({})).products).toHaveLength(24)
    const second = listing(many, facets, params({ page: '2' }))
    expect(second).toMatchObject({ total: 30, page: 2, pageCount: 2 })
    expect(second.products).toHaveLength(6)
    expect(listing([], facets, params({})).pageCount).toBe(1)
  })
})
