import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload';

import { editors, hasRole, isStaff } from '@/lib/access';
import { pageBlocks } from './page-blocks';
import { storefrontHooks } from './revalidate';
import { slugField } from './slug-field';

// A post's day, set when it is published without one; a day the owner typed stays, so a post can
// carry an earlier one. An update that does not send the field keeps the stored day.
export const datePublished: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
}) => {
  const day =
    data.publishedAt === undefined
      ? originalDoc?.publishedAt
      : data.publishedAt;
  return data._status === 'published' && !day
    ? { ...data, publishedAt: new Date().toISOString() }
    : data;
};

// The store's blog, `/blog` and `/blog/<slug>`: posts built from the same blocks as pages, with a day,
// a cover and a short summary for the list. Unlike a page, a post is written as a draft and reaches
// the storefront once published.
export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Запис блогу', plural: 'Блог' },
  defaultSort: '-publishedAt',
  admin: {
    group: 'Сторінки',
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', '_status'],
    description:
      'Записи на сторінці «Блог», нові зверху. Чернетку бачить лише персонал; на сайті — після «Опублікувати зміни».',
    // The versions' tab hidden, as on products: people who run the store read it as a second copy.
    components: {
      views: { edit: { versions: { tab: { condition: () => false } } } },
    },
  },
  // The storefront reads with `overrideAccess: false`, so it gets published posts alone (RULES.md).
  versions: { drafts: true },
  access: {
    read: ({ req }) =>
      isStaff(req.user) ? true : { _status: { equals: 'published' } },
    // Unstated, any session reads a draft through its version.
    readVersions: hasRole,
    ...editors,
  },
  hooks: { beforeChange: [datePublished], ...storefrontHooks },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Назва',
      localized: true,
      required: true,
    },
    slugField('title'),
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Дата',
      index: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' },
        description: 'Над записом і в списку. Порожня — день публікації.',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      label: 'Короткий опис',
      localized: true,
      admin: {
        description:
          'Два-три речення: у списку записів, під назвою запису і для пошуковиків.',
      },
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
      label: 'Обкладинка',
      admin: {
        description:
          'У списку записів, під назвою запису і в посиланнях у соцмережах.',
      },
    },
    { name: 'blocks', type: 'blocks', label: 'Блоки', blocks: pageBlocks },
  ],
};
