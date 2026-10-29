import type { Access, Field, FieldAccess } from 'payload'
import { describe, expect, it } from 'vitest'

import { Brands, Categories, Media, SkinConcerns, SkinConditions, SkinTypes } from './catalog/collections'
import { keepOnRestore, Products } from './catalog/products'
import { collections } from './collections'
import { Users } from './collections/Users'

const owner = { id: 1, role: 'owner' }
const cosmetologist = { id: 2, role: 'cosmetologist' }
const args = (user: object | null, id?: number | string) => ({ req: { user }, id }) as never
const run = (access: Access | FieldAccess | undefined, user: object | null, id?: number | string) => access!(args(user, id))

function field(fields: Field[], name: string): Field | undefined {
  for (const f of fields) {
    if ('name' in f && f.name === name) return f
    const found = 'fields' in f ? field(f.fields, name) : undefined
    if (found) return found
  }
}
const fieldAccess = (fields: Field[], name: string) => (field(fields, name) as { access: Record<string, FieldAccess> }).access

describe('every collection', () => {
  it.each(collections.map((c) => [c.slug, c] as const))('%s states its own create, update and delete access', (_, c) => {
    for (const operation of ['create', 'update', 'delete'] as const) expect(c.access?.[operation]).toBeTypeOf('function')
  })
})

describe('catalog', () => {
  it.each([Products, Categories, Brands, SkinTypes, SkinConditions, SkinConcerns, Media].map((c) => [c.slug, c] as const))(
    '%s: both roles create and edit, only the owner deletes',
    (_, { access }) => {
      for (const operation of ['create', 'update'] as const) {
        expect([run(access![operation], owner), run(access![operation], cosmetologist), run(access![operation], null)]).toEqual([true, true, false])
      }
      expect([run(access!.delete, owner), run(access!.delete, cosmetologist), run(access!.delete, null)]).toEqual([true, false, false])
    },
  )

  it.each(['price', 'availability', 'madeToOrderDays'])('the owner alone sets %s', (name) => {
    const access = fieldAccess(Products.fields, name)
    for (const operation of ['create', 'update'] as const) {
      expect([run(access[operation], owner), run(access[operation], cosmetologist)]).toEqual([true, false])
    }
  })

  // A restore drops what the role may not set and does not put it back (review F1). The products'
  // first hook, before the fields run: the days' condition reads availability (review F4).
  it('a restore keeps the current price, availability and days the role could not set', () => {
    const [first] = Products.hooks!.beforeChange!
    const originalDoc = { price: 89000, availability: 'made_to_order', madeToOrderDays: 7 }
    const restore = (data: object, isRestoringVersion = true) => first({ data, originalDoc, req: { context: { isRestoringVersion } } } as never)
    expect(first).toBe(keepOnRestore)
    expect(restore({ name: 'Крем' })).toEqual({ name: 'Крем', ...originalDoc })
    expect(restore({ price: 50000, availability: 'in_stock', madeToOrderDays: null })).toEqual({ price: 50000, availability: 'in_stock', madeToOrderDays: null })
    expect(restore({ name: 'Крем' }, false)).toEqual({ name: 'Крем' })
  })

  it('anonymous visitors read published products only', () => {
    expect(run(Products.access!.read, null)).toEqual({ _status: { equals: 'published' } })
    expect(run(Products.access!.read, cosmetologist)).toBe(true)
  })
})

describe('users', () => {
  const { access } = Users

  it('a role opens the admin', () => {
    expect([run(access!.admin, owner), run(access!.admin, cosmetologist), run(access!.admin, { id: 3 })]).toEqual([true, true, false])
  })

  it('the owner reads and edits everyone, the cosmetologist herself', () => {
    for (const operation of ['read', 'update'] as const) {
      expect(run(access![operation], owner)).toBe(true)
      expect(run(access![operation], cosmetologist)).toEqual({ id: { equals: 2 } })
      expect(run(access![operation], null)).toBe(false)
    }
  })

  it('only the owner creates users, and deletes anyone but himself', () => {
    expect([run(access!.create, owner), run(access!.create, cosmetologist)]).toEqual([true, false])
    expect(run(access!.delete, owner)).toEqual({ id: { not_equals: 1 } })
    expect([run(access!.delete, cosmetologist), run(access!.delete, null)]).toEqual([false, false])
  })

  it('only the owner sets roles, and never his own', () => {
    const role = fieldAccess(Users.fields, 'role')
    expect([run(role.create, owner), run(role.create, cosmetologist)]).toEqual([true, false])
    expect([run(role.update, owner, 2), run(role.update, owner, '2')]).toEqual([true, true])
    expect([run(role.update, owner, 1), run(role.update, owner, '1'), run(role.update, cosmetologist, 2)]).toEqual([false, false, false])
  })
})
