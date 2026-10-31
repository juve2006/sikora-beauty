import type { CollectionConfig } from 'payload';

import { hasRole } from '@/lib/access';
import { spellings } from '@/lib/search';

// Spellings search takes for one another: a brand in Cyrillic, an active's other name. Not
// localized — a shopper on either language may type any of them. Both roles keep them, from what
// «Пошук без результатів» shows; search reads them for anyone.
export const SearchSynonyms: CollectionConfig = {
  slug: 'search-synonyms',
  labels: { singular: 'Синоніми', plural: 'Синоніми пошуку' },
  admin: {
    group: 'Пошук',
    useAsTitle: 'spellings',
    description:
      'Різні написання одного й того самого, по одному в рядку: пошук за будь-яким знаходить і за рештою.',
  },
  access: {
    read: () => true,
    create: hasRole,
    update: hasRole,
    delete: hasRole,
  },
  fields: [
    {
      name: 'spellings',
      type: 'textarea',
      label: 'Написання',
      required: true,
      admin: { placeholder: 'Dr.Spiller\nдоктор шпіллер\nшпіллер' },
      validate: (value: string | null | undefined) =>
        spellings(value).length >= 2 ||
        'Потрібно щонайменше два написання, по одному в рядку.',
    },
  ],
};
