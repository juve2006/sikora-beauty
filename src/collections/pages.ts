import type { CollectionConfig } from 'payload';

import { editors } from '@/lib/access';
import { pageSlug } from '@/lib/validators';
import { pageBlocks } from './page-blocks';
import { storefrontHooks } from './revalidate';
import { slugField } from './slug-field';

// The storefront's pages, built from blocks: `home` is the home page at `/`, any other opens at
// `/<slug>` — the about page now, the offer, delivery and returns later — without a deploy.
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Сторінка', plural: 'Сторінки' },
  admin: {
    group: 'Сторінки',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug'],
    description:
      'Головна — сторінка з адресою home; будь-яка інша відкривається за своєю адресою.',
  },
  access: { read: () => true, ...editors },
  hooks: storefrontHooks,
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Назва',
      localized: true,
      required: true,
    },
    slugField(
      'title',
      (value) =>
        !value ||
        pageSlug.safeParse(value).success ||
        'Ця адреса — розділ магазину. Оберіть іншу.',
    ),
    { name: 'blocks', type: 'blocks', label: 'Блоки', blocks: pageBlocks },
  ],
};
