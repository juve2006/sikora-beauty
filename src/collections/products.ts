import {
  type CollectionBeforeChangeHook,
  type CollectionConfig,
  ValidationError,
} from 'payload';

import { editors, ownerField } from '@/lib/access';
import { importEndpoints } from './import-endpoints';
import { revalidateStorefront } from './revalidate';
import { hasDaysIfMadeToOrder, hasInciSource, kopiyky } from '@/lib/validators';
import {
  AVAILABILITIES,
  VOLUME_UNIT_LABELS,
  VOLUME_UNITS,
} from '@/lib/constants';
import { slugField } from './slug-field';

// Admin labels only: the storefront translates the values through messages/*.json.
const availabilityLabels = {
  in_stock: 'В наявності',
  made_to_order: 'Під замовлення',
  out_of_stock: 'Немає в наявності',
};

// Drafts skip field validation; these run when a product is published.
const rule = (ok: boolean, message: string) => ok || message;
const priceMessage = 'Вкажіть ціну: 1245 або 1245,50';

// Prices and availability are the owner's (GLOSSARY): the cosmetologist sees them, and a value she
// sends is dropped. Both are required on publishing, so her new product waits for the owner.
const ownerOnly = { create: ownerField, update: ownerField };
// Restoring a version skips the step that puts a dropped value back from the document, so the
// cosmetologist's restore would lose them and fail validation: she keeps the current ones. A
// collection hook, not a field one: Payload runs the fields at once, and the days' condition would
// read availability before a field hook put it back, skipping its check.
export const keepOnRestore: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
}) => {
  if (!req.context.isRestoringVersion) return data;
  const dropped = (
    ['price', 'availability', 'madeToOrderDays'] as const
  ).filter((name) => data[name] === undefined);
  return {
    ...data,
    ...Object.fromEntries(dropped.map((name) => [name, originalDoc?.[name]])),
  };
};

// Payload checks `required` only in the locale being saved: a product written in English alone
// would be published with no Ukrainian name and show nameless at `/`.
const requireUkrainianName: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (data._status !== 'published' || req.locale === 'uk') return data;
  // Without `req`: given one, the Local API sets its locale to 'uk', and this save would then
  // write the English texts over the Ukrainian ones.
  const uk = originalDoc?.id
    ? await req.payload.findByID({
        collection: 'products',
        id: originalDoc.id,
        locale: 'uk',
        fallbackLocale: false,
        draft: true,
        depth: 0,
      })
    : null;
  if (!uk?.name?.trim()) {
    const message = 'Спершу заповніть назву українською: Локалізація → uk';
    throw new ValidationError(
      { errors: [{ label: 'Назва', message, path: 'name' }] },
      req.t,
    );
  }
  return data;
};

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Товар', plural: 'Товари' },
  admin: {
    group: 'Каталог',
    useAsTitle: 'name',
    defaultColumns: ['name', 'brand', 'price', 'availability', '_status'],
  },
  // A product reaches the storefront only once published (RULES.md). The storefront reads with
  // `overrideAccess: false`: the Local API's default skips this rule and would return drafts.
  versions: { drafts: true },
  access: {
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
    ...editors,
  },
  hooks: {
    beforeChange: [keepOnRestore, requireUkrainianName],
    afterChange: [revalidateStorefront],
    afterDelete: [revalidateStorefront],
  },
  // The owner's «Імпорт» page: products from cosmetika.com.ua and prices in CSV.
  endpoints: importEndpoints,
  fields: [
    {
      name: 'translate',
      type: 'ui',
      admin: {
        components: { Field: '/components/admin/translate-button' },
        disableListColumn: true,
      },
    },
    {
      name: 'name',
      type: 'text',
      label: 'Назва',
      localized: true,
      required: true,
    },
    slugField('name'),
    {
      type: 'row',
      fields: [
        {
          name: 'brand',
          type: 'relationship',
          relationTo: 'brands',
          label: 'Бренд',
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
    {
      type: 'row',
      fields: [
        {
          name: 'price',
          type: 'number',
          label: 'Ціна, грн',
          required: true,
          access: ownerOnly,
          admin: {
            components: {
              Field: '/components/admin/price-field',
              Cell: '/components/admin/price-cell',
            },
          },
          validate: (value: unknown) =>
            rule(kopiyky.safeParse(value).success, priceMessage),
          // Money is integer kopiyky in a draft too (RULES.md); a draft may only leave it empty.
          hooks: {
            beforeChange: [
              ({ value, req }) => {
                if (value != null && !kopiyky.safeParse(value).success) {
                  throw new ValidationError(
                    {
                      errors: [
                        {
                          label: 'Ціна, грн',
                          message: priceMessage,
                          path: 'price',
                        },
                      ],
                    },
                    req.t,
                  );
                }
                return value;
              },
            ],
          },
        },
        {
          name: 'volume',
          type: 'number',
          label: "Об'єм або кількість",
          min: 0,
        },
        {
          name: 'volumeUnit',
          type: 'select',
          label: 'Одиниця',
          options: VOLUME_UNITS.map((value) => ({
            value,
            label: VOLUME_UNIT_LABELS[value],
          })),
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'availability',
          type: 'select',
          label: 'Наявність',
          required: true,
          access: ownerOnly,
          options: AVAILABILITIES.map((value) => ({
            value,
            label: availabilityLabels[value],
          })),
        },
        {
          name: 'madeToOrderDays',
          type: 'number',
          label: 'Днів до відправки',
          access: ownerOnly,
          admin: {
            condition: (_, sibling) => sibling.availability === 'made_to_order',
          },
          validate: (
            value: unknown,
            { siblingData }: { siblingData: { availability?: string } },
          ) =>
            rule(
              hasDaysIfMadeToOrder({ ...siblingData, madeToOrderDays: value }),
              'Вкажіть від 1 до 90 днів',
            ),
        },
      ],
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      label: 'Фото',
      hasMany: true,
      admin: { description: 'Перше фото — головне.' },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Опис',
          fields: [
            {
              name: 'shortDescription',
              type: 'textarea',
              label: 'Короткий опис',
              localized: true,
            },
            {
              name: 'purpose',
              type: 'textarea',
              label: 'Призначення та очікуваний косметичний ефект',
              localized: true,
            },
            {
              name: 'actives',
              type: 'array',
              label: 'Активні компоненти',
              labels: { singular: 'Компонент', plural: 'Компоненти' },
              fields: [
                {
                  name: 'name',
                  type: 'text',
                  label: 'Компонент',
                  localized: true,
                  required: true,
                },
                {
                  name: 'role',
                  type: 'textarea',
                  label: 'Його роль',
                  localized: true,
                },
              ],
            },
            {
              name: 'howToUse',
              type: 'textarea',
              label: 'Спосіб застосування',
              localized: true,
            },
            {
              name: 'warnings',
              type: 'textarea',
              label: 'Застереження',
              localized: true,
            },
          ],
        },
        {
          label: 'Склад INCI',
          fields: [
            {
              name: 'inci',
              type: 'textarea',
              label: 'Склад INCI',
              admin: {
                description:
                  'Лише скопійований з упаковки, сайту бренду чи від дистриб’ютора.',
              },
            },
            {
              name: 'inciSource',
              type: 'text',
              label: 'Джерело INCI',
              admin: {
                description:
                  'Звідки скопійовано: «упаковка», посилання на сторінку бренду…',
              },
              validate: (
                value: unknown,
                { siblingData }: { siblingData: { inci?: string | null } },
              ) =>
                rule(
                  hasInciSource({ inci: siblingData.inci, inciSource: value }),
                  'Вкажіть, звідки скопійовано склад',
                ),
            },
          ],
        },
        {
          label: 'Шкіра',
          fields: [
            {
              name: 'skinTypes',
              type: 'relationship',
              relationTo: 'skin-types',
              label: 'Типи шкіри',
              hasMany: true,
            },
            {
              name: 'skinConditions',
              type: 'relationship',
              relationTo: 'skin-conditions',
              label: 'Стани шкіри',
              hasMany: true,
            },
            {
              name: 'skinConcerns',
              type: 'relationship',
              relationTo: 'skin-concerns',
              label: 'Потреби шкіри',
              hasMany: true,
            },
          ],
        },
      ],
    },
    {
      name: 'related',
      type: 'relationship',
      relationTo: 'products',
      label: 'Супутні товари',
      hasMany: true,
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
    },
    {
      type: 'collapsible',
      label: 'Добірки',
      admin: { position: 'sidebar' },
      fields: [
        { name: 'isNew', type: 'checkbox', label: 'Новинка' },
        { name: 'isBestseller', type: 'checkbox', label: 'Бестселер' },
        { name: 'isSet', type: 'checkbox', label: 'Набір або комплект' },
        {
          name: 'isMini',
          type: 'checkbox',
          label: 'Мініатюра або travel-формат',
        },
      ],
    },
  ],
};
