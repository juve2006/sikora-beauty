import type { Block, TextField, TextareaField, UploadField } from 'payload';

import { internalPath } from '@/lib/validators';

// What a page is built from, in the order the admin sets; one order for both languages, the texts
// localized.

const title: TextField = {
  name: 'title',
  type: 'text',
  label: 'Заголовок',
  localized: true,
  required: true,
};
const text: TextareaField = {
  name: 'text',
  type: 'textarea',
  label: 'Текст',
  localized: true,
  admin: { description: 'Абзаци — через порожній рядок.' },
};
const image: UploadField = {
  name: 'image',
  type: 'upload',
  relationTo: 'media',
  label: 'Фото',
};

export const pageBlocks: Block[] = [
  {
    slug: 'hero',
    labels: { singular: 'Головний банер', plural: 'Головні банери' },
    fields: [
      title,
      text,
      image,
      {
        type: 'row',
        fields: [
          {
            name: 'buttonLabel',
            type: 'text',
            label: 'Текст кнопки',
            localized: true,
          },
          {
            name: 'buttonLink',
            type: 'text',
            label: 'Куди веде кнопка',
            admin: {
              description: 'Сторінка магазину, наприклад /catalog/face',
            },
            validate: (value: string | null | undefined) =>
              !value ||
              internalPath.safeParse(value).success ||
              'Лише сторінка цього магазину: адреса починається з /',
          },
        ],
      },
    ],
  },
  {
    slug: 'products',
    // GraphQL names a block's type after its slug: `Products` is the products collection's.
    interfaceName: 'ProductsBlock',
    labels: { singular: 'Товари', plural: 'Товари' },
    fields: [
      title,
      {
        name: 'collection',
        type: 'select',
        label: 'Які товари',
        required: true,
        options: [
          { value: 'new', label: 'Новинки' },
          { value: 'bestsellers', label: 'Бестселери' },
          { value: 'sets', label: 'Набори' },
          { value: 'minis', label: 'Мініатюри' },
        ],
      },
      {
        name: 'limit',
        type: 'number',
        label: 'Скільки показати',
        required: true,
        defaultValue: 4,
        min: 4,
        max: 12,
      },
    ],
  },
  {
    slug: 'tiles',
    labels: { singular: 'Плитки', plural: 'Плитки' },
    fields: [
      title,
      {
        name: 'source',
        type: 'select',
        label: 'Що показати',
        required: true,
        options: [
          { value: 'zones', label: 'Зони' },
          { value: 'concerns', label: 'Потреби шкіри' },
          { value: 'types', label: 'Типи шкіри' },
        ],
      },
    ],
  },
  {
    slug: 'consultation',
    labels: { singular: 'Консультація', plural: 'Консультації' },
    fields: [title, text],
  },
  {
    slug: 'text',
    labels: { singular: 'Текст', plural: 'Тексти' },
    fields: [title, { ...text, required: true }, image],
  },
];
