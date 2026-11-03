import { APIError, type CollectionConfig, type PayloadRequest } from 'payload';

import { editors } from '@/lib/access';
import { storefrontHooks } from './revalidate';
import { slugField } from './slug-field';

// Zones and categories are one tree (GLOSSARY): a zone has no parent, a category's parent is a zone.
export function parentError(
  parent: { parent?: unknown } | null,
  ownId: unknown,
  children: number,
) {
  if (!parent) return null;
  if (children > 0) return 'Зона з категоріями не може стати категорією';
  if (parent.parent || ('id' in parent && parent.id === ownId))
    return 'Вибрати можна лише зону';
  return null;
}

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Зона або категорія', plural: 'Зони й категорії' },
  admin: {
    group: 'Каталог',
    useAsTitle: 'fullTitle',
    defaultColumns: ['fullTitle', 'slug'],
    description:
      'Зона — верхній рівень каталогу (Обличчя, Тіло…), поле «Зона» в ній порожнє. Категорія — тип товару всередині зони: виберіть зону в полі «Зона».',
  },
  orderable: true,
  access: { read: () => true, ...editors },
  hooks: {
    ...storefrontHooks,
    // The database sets a deleted zone's categories' parent to null, which would make them zones.
    beforeDelete: [
      async ({ id, req }) => {
        const { totalDocs } = await req.payload.count({
          collection: 'categories',
          where: { parent: { equals: id } },
          req,
        });
        if (totalDocs > 0)
          throw new APIError(
            'Спершу перенесіть або видаліть категорії цієї зони',
            400,
          );
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Назва',
      localized: true,
      required: true,
    },
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
            const parentId = siblingData.parent;
            if (parentId == null) return siblingData.title;
            const zone = await req.payload.findByID({
              collection: 'categories',
              id: typeof parentId === 'object' ? parentId.id : parentId,
              depth: 0,
              locale: req.locale,
              req,
            });
            return `${zone.title} → ${siblingData.title}`;
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
};

async function validateParent(
  value: unknown,
  { id, req }: { id?: number | string; req: PayloadRequest },
) {
  const parentId =
    typeof value === 'object' && value ? (value as { id: unknown }).id : value;
  if (parentId == null) return true;
  const parent = await req.payload.findByID({
    collection: 'categories',
    id: parentId as number,
    depth: 0,
    req,
  });
  const { totalDocs } = id
    ? await req.payload.count({
        collection: 'categories',
        where: { parent: { equals: id } },
        req,
      })
    : { totalDocs: 0 };
  return parentError(parent, id, totalDocs) ?? true;
}
