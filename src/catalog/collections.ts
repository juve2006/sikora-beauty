import { APIError, type CollectionConfig, type PayloadRequest } from 'payload'

import { editors } from '../access'
import { revalidateStorefront } from './revalidate'
import { slugField } from './slug'

// Brands, the zone and category tree, the skin vocabularies and photos. Products: products.ts.

const group = 'Каталог'
const hooks = { afterChange: [revalidateStorefront], afterDelete: [revalidateStorefront] }

export const Brands: CollectionConfig = {
  slug: 'brands',
  labels: { singular: 'Бренд', plural: 'Бренди' },
  admin: { group, useAsTitle: 'name', defaultColumns: ['name', 'slug'] },
  defaultSort: 'name',
  access: { read: () => true, ...editors },
  hooks: {
    ...hooks,
    // The database sets a deleted brand's products' brand to null. A draft saved over a published
    // product keeps its brand only in the latest version, so both are counted; older versions are not.
    beforeDelete: [
      async ({ id, req }) => {
        const products = await req.payload.count({ collection: 'products', where: { brand: { equals: id } }, req })
        const drafts = await req.payload.countVersions({
          collection: 'products',
          where: { 'version.brand': { equals: id }, latest: { equals: true } },
          req,
        })
        if (products.totalDocs + drafts.totalDocs > 0) {
          throw new APIError('Спершу перенесіть або видаліть товари цього бренду', 400)
        }
      },
    ],
  },
  fields: [{ name: 'name', type: 'text', label: 'Назва', required: true }, slugField('name')],
}

// Zones and categories are one tree (GLOSSARY): a zone has no parent, a category's parent is a zone.
export function parentError(parent: { parent?: unknown } | null, ownId: unknown, children: number) {
  if (!parent) return null
  if (children > 0) return 'Зона з категоріями не може стати категорією'
  if (parent.parent || ('id' in parent && parent.id === ownId)) return 'Батьком може бути лише зона'
  return null
}

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Зона або категорія', plural: 'Зони й категорії' },
  admin: {
    group,
    useAsTitle: 'fullTitle',
    defaultColumns: ['fullTitle', 'slug'],
    description: 'Зона — запис без батька (Обличчя, Тіло…). Категорія — запис, чий батько зона.',
  },
  orderable: true,
  access: { read: () => true, ...editors },
  hooks: {
    ...hooks,
    // The database sets a deleted zone's categories' parent to null, which would make them zones.
    beforeDelete: [
      async ({ id, req }) => {
        const { totalDocs } = await req.payload.count({ collection: 'categories', where: { parent: { equals: id } }, req })
        if (totalDocs > 0) throw new APIError('Спершу перенесіть або видаліть категорії цієї зони', 400)
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', label: 'Назва', localized: true, required: true },
    slugField('title'),
    // "Обличчя → Очищення": face and body both have "Очищення", and a picker shows only the title.
    // ponytail: it is computed in the locale being saved, so renaming a zone, or moving a category,
    // leaves the other locale (and the zone's categories) stale until saved there. Zones are three
    // and fixed — re-save per locale in an afterChange hook if the tree starts changing.
    {
      name: 'fullTitle',
      type: 'text',
      label: 'Повна назва',
      localized: true,
      admin: { readOnly: true, position: 'sidebar' },
      hooks: {
        beforeChange: [
          async ({ siblingData, req }) => {
            const parentId = siblingData.parent
            if (parentId == null) return siblingData.title
            const zone = await req.payload.findByID({
              collection: 'categories',
              id: typeof parentId === 'object' ? parentId.id : parentId,
              depth: 0,
              locale: req.locale,
              req,
            })
            return `${zone.title} → ${siblingData.title}`
          },
        ],
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      label: 'Зона',
      admin: { position: 'sidebar' },
      filterOptions: { parent: { exists: false } },
      validate: validateParent,
    },
  ],
}

async function validateParent(value: unknown, { id, req }: { id?: number | string; req: PayloadRequest }) {
  const parentId = typeof value === 'object' && value ? (value as { id: unknown }).id : value
  if (parentId == null) return true
  const parent = await req.payload.findByID({ collection: 'categories', id: parentId as number, depth: 0, req })
  const { totalDocs } = id
    ? await req.payload.count({ collection: 'categories', where: { parent: { equals: id } }, req })
    : { totalDocs: 0 }
  return parentError(parent, id, totalDocs) ?? true
}

function vocabulary(slug: string, singular: string, plural: string): CollectionConfig {
  return {
    slug,
    labels: { singular, plural },
    admin: { group, useAsTitle: 'title', defaultColumns: ['title', 'slug'] },
    orderable: true,
    access: { read: () => true, ...editors },
    hooks,
    fields: [{ name: 'title', type: 'text', label: 'Назва', localized: true, required: true }, slugField('title')],
  }
}

export const SkinTypes = vocabulary('skin-types', 'Тип шкіри', 'Типи шкіри')
export const SkinConditions = vocabulary('skin-conditions', 'Стан шкіри', 'Стани шкіри')
export const SkinConcerns = vocabulary('skin-concerns', 'Потреба шкіри', 'Потреби шкіри')

// Stored in Vercel Blob on Vercel (payload.config.ts), on the local disk without its token.
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Фото', plural: 'Фото' },
  admin: { group },
  access: { read: () => true, ...editors },
  hooks,
  upload: { mimeTypes: ['image/*'] },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Що на фото (для незрячих і пошуку)',
      localized: true,
      required: true,
    },
  ],
}
