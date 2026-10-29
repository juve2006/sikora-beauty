import { describe, expect, it } from 'vitest'

import { parentError } from './collections'
import { formatHryvnias, parseHryvnias } from './price'
import { productRules } from './schema'
import { slugify } from './slug'
import { toTranslate } from './translate'

describe('prices', () => {
  it('reads hryvnias as integer kopiyky', () => {
    expect(parseHryvnias('1245')).toBe(124500)
    expect(parseHryvnias('1 245,5')).toBe(124550)
    expect(parseHryvnias('1245.05')).toBe(124505)
    expect(parseHryvnias('0,99')).toBe(99)
  })

  it('refuses what is not a price', () => {
    for (const input of ['', '12,345', '-5', '12a', '1,2,3']) expect(parseHryvnias(input)).toBeNull()
  })

  it('writes kopiyky back as hryvnias', () => {
    expect(formatHryvnias(124500)).toBe('1245')
    expect(formatHryvnias(124505)).toBe('1245,05')
    expect(formatHryvnias(99)).toBe('0,99')
  })
})

describe('slugify', () => {
  it('transliterates Ukrainian by the national rules', () => {
    expect(slugify('Гель для вмивання')).toBe('hel-dlia-vmyvannia')
    expect(slugify('Ярина')).toBe('yaryna')
    expect(slugify("М'ята і їжак")).toBe('miata-i-yizhak')
    expect(slugify('Згарище')).toBe('zgharyshche')
  })

  it('keeps Latin names and drops the rest', () => {
    expect(slugify('Dr.Spiller Aloe Vera 50 ml')).toBe('dr-spiller-aloe-vera-50-ml')
    expect(slugify('  Glymed+  ')).toBe('glymed')
  })
})

describe('productRules', () => {
  const product = { price: 124500, availability: 'in_stock' as const }

  it('accepts a product in stock', () => {
    expect(productRules.safeParse(product).success).toBe(true)
  })

  it('takes prices only as whole kopiyky', () => {
    expect(productRules.safeParse({ ...product, price: 1245.5 }).success).toBe(false)
    expect(productRules.safeParse({ ...product, price: -1 }).success).toBe(false)
  })

  it('asks for days when made to order', () => {
    const made = { ...product, availability: 'made_to_order' as const }
    expect(productRules.safeParse(made).success).toBe(false)
    expect(productRules.safeParse({ ...made, madeToOrderDays: 14 }).success).toBe(true)
  })

  it('never takes INCI without its source', () => {
    expect(productRules.safeParse({ ...product, inci: 'Aqua, Glycerin' }).success).toBe(false)
    expect(
      productRules.safeParse({ ...product, inci: 'Aqua, Glycerin', inciSource: 'packaging' }).success,
    ).toBe(true)
  })
})

describe('parentError', () => {
  const zone = { id: 1, parent: null }
  const category = { id: 2, parent: 1 }

  it('lets a record be a zone, or a category under a zone', () => {
    expect(parentError(null, 5, 0)).toBeNull()
    expect(parentError(zone, 5, 0)).toBeNull()
  })

  it('keeps the tree two levels deep', () => {
    expect(parentError(category, 5, 0)).toBe('Батьком може бути лише зона')
    expect(parentError(zone, 1, 0)).toBe('Батьком може бути лише зона')
    expect(parentError(zone, 5, 2)).toBe('Зона з категоріями не може стати категорією')
  })
})

describe('toTranslate', () => {
  const uk = {
    name: 'Сироватка',
    shortDescription: 'Зволожує',
    purpose: '  ',
    actives: [
      { id: 'a', name: 'Гіалуронова кислота', role: 'Утримує вологу' },
      { id: 'b', name: 'Ніацинамід', role: null },
    ],
  }

  it('fills only empty texts whose Ukrainian text exists', () => {
    const en = { name: 'Serum', shortDescription: '', purpose: null, actives: [{ id: 'a', name: 'Hyaluronic acid' }] }
    expect(toTranslate(uk, en)).toEqual([
      { path: 'shortDescription', text: 'Зволожує' },
      { path: 'actives.0.role', text: 'Утримує вологу' },
    ])
  })

  it('matches actives rows by id, not by position', () => {
    const en = { name: 'Serum', shortDescription: 'Hydrates', actives: [{ id: 'b' }, { id: 'new' }] }
    expect(toTranslate(uk, en)).toEqual([{ path: 'actives.0.name', text: 'Ніацинамід' }])
  })

  it('reads a form without actives rows, where the array is its row count', () => {
    expect(toTranslate({ name: 'Крем', actives: [] }, { name: '', actives: 0 })).toEqual([{ path: 'name', text: 'Крем' }])
  })
})
