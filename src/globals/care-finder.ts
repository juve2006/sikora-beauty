import type { GlobalConfig } from 'payload';

import { revalidateStorefront } from '@/collections/revalidate';
import { hasRole } from '@/lib/access';

// The terms an answer means; empty means nothing («Нічого з цього»).
const terms = [
  ['skinTypes', 'skin-types', 'Типи шкіри'],
  ['skinConditions', 'skin-conditions', 'Стани шкіри'],
  ['skinConcerns', 'skin-concerns', 'Потреби шкіри'],
] as const;

// The care finder (GLOSSARY): its questions, what each answer means, and the routine's steps — one
// screen of the admin, kept by both roles. No drafts: a save is live at once, as a page's is, and
// `enabled` keeps it off the store until the cosmetologist has written it (task `care-finder`). A
// shopper's answers are the answers' row ids, which survive a reorder and an edited text.
export const CareFinder: GlobalConfig = {
  slug: 'care-finder',
  label: 'Підбір догляду',
  admin: { group: 'Каталог' },
  access: { read: () => true, update: hasRole },
  hooks: { afterChange: [revalidateStorefront] },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      label: 'Показувати на сайті',
      admin: {
        description:
          'Поки вимкнено, пункту «Підбір догляду» в меню немає, а сторінка анкети недоступна.',
      },
    },
    {
      name: 'questions',
      type: 'array',
      label: 'Питання',
      labels: { singular: 'Питання', plural: 'Питання' },
      required: true,
      minRows: 1,
      maxRows: 10,
      admin: {
        description:
          'По одному на екран, у цьому порядку. Кожна відповідь означає типи, стани й потреби шкіри: рутина бере товари з ними.',
      },
      fields: [
        {
          name: 'question',
          type: 'text',
          label: 'Питання',
          localized: true,
          required: true,
        },
        { name: 'hint', type: 'text', label: 'Підказка', localized: true },
        {
          name: 'multiple',
          type: 'checkbox',
          label: 'Можна кілька відповідей',
        },
        {
          name: 'answers',
          type: 'array',
          label: 'Відповіді',
          labels: { singular: 'Відповідь', plural: 'Відповіді' },
          required: true,
          minRows: 2,
          maxRows: 8,
          fields: [
            {
              name: 'label',
              type: 'text',
              label: 'Відповідь',
              localized: true,
              required: true,
            },
            ...terms.map(([name, relationTo, label]) => ({
              name,
              type: 'relationship' as const,
              relationTo,
              label,
              hasMany: true,
            })),
          ],
        },
      ],
    },
    {
      name: 'steps',
      type: 'array',
      label: 'Кроки рутини',
      labels: { singular: 'Крок', plural: 'Кроки' },
      required: true,
      minRows: 1,
      maxRows: 8,
      admin: {
        description:
          'У цьому порядку. Крок показує до двох товарів у наявності з його категорій, найближчих до відповідей.',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Крок',
          localized: true,
          required: true,
        },
        {
          name: 'categories',
          type: 'relationship',
          relationTo: 'categories',
          label: 'Категорії',
          hasMany: true,
          required: true,
          filterOptions: { parent: { exists: true } },
        },
      ],
    },
  ],
};
