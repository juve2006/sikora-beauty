import type { CollectionConfig } from 'payload';
import { editors } from '@/lib/access';
import { storefrontHooks } from './revalidate';
import { slugField } from './slug-field';

// Skin type, condition and concern: collections, not selects, so the cosmetologist adds a term
// without a deploy.
function vocabulary(
  slug: string,
  singular: string,
  plural: string,
): CollectionConfig {
  return {
    slug,
    labels: { singular, plural },
    admin: {
      group: 'Каталог',
      useAsTitle: 'title',
      defaultColumns: ['title', 'slug'],
    },
    orderable: true,
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
      slugField('title'),
    ],
  };
}

export const SkinTypes = vocabulary('skin-types', 'Тип шкіри', 'Типи шкіри');
export const SkinConditions = vocabulary(
  'skin-conditions',
  'Стан шкіри',
  'Стани шкіри',
);
export const SkinConcerns = vocabulary(
  'skin-concerns',
  'Потреба шкіри',
  'Потреби шкіри',
);
