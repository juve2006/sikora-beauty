import { APIError, type CollectionConfig } from 'payload';
import { editors } from '@/lib/access';
import { storefrontHooks } from './revalidate';
import { slugField } from './slug-field';

export const Brands: CollectionConfig = {
  slug: 'brands',
  labels: { singular: 'Бренд', plural: 'Бренди' },
  admin: {
    group: 'Каталог',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug'],
  },
  defaultSort: 'name',
  access: { read: () => true, ...editors },
  hooks: {
    ...storefrontHooks,
    // The database sets a deleted brand's products' brand to null. A draft saved over a published
    // product keeps its brand only in the latest version, so both are counted; older versions are not.
    beforeDelete: [
      async ({ id, req }) => {
        const products = await req.payload.count({
          collection: 'products',
          where: { brand: { equals: id } },
          req,
        });
        const drafts = await req.payload.countVersions({
          collection: 'products',
          where: { 'version.brand': { equals: id }, latest: { equals: true } },
          req,
        });
        if (products.totalDocs + drafts.totalDocs > 0) {
          throw new APIError(
            'Спершу перенесіть або видаліть товари цього бренду',
            400,
          );
        }
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', label: 'Назва', required: true },
    slugField('name'),
  ],
};
