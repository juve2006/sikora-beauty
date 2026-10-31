import type { CollectionConfig } from 'payload';

import { hasRole, nobody } from '@/lib/access';
import { routing } from '@/i18n/routing';

// What a shopper searched for and the results page found nothing: what a synonym or a product is
// missing for. Only the search page writes it, through the Local API, counting repeats; both roles
// read it and delete what they dealt with.
export const SearchMisses: CollectionConfig = {
  slug: 'search-misses',
  labels: {
    singular: 'Пошук без результатів',
    plural: 'Пошук без результатів',
  },
  admin: {
    group: 'Пошук',
    useAsTitle: 'query',
    defaultColumns: ['query', 'count', 'locale', 'updatedAt'],
    description:
      'Що шукали й не знайшли. Додайте синонім чи товар — тоді видаліть запис.',
  },
  defaultSort: '-count',
  access: { read: hasRole, create: nobody, update: nobody, delete: hasRole },
  fields: [
    {
      name: 'query',
      type: 'text',
      label: 'Запит',
      required: true,
      unique: true,
    },
    {
      name: 'count',
      type: 'number',
      label: 'Скільки разів',
      required: true,
    },
    {
      name: 'locale',
      type: 'select',
      label: 'Мова першого пошуку',
      required: true,
      options: routing.locales.map((locale) => ({
        label: locale,
        value: locale,
      })),
    },
  ],
};
