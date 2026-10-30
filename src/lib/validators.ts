import { z } from 'zod';

import { AVAILABILITIES, SORTS } from '@/lib/constants';
import { parseHryvnias } from '@/lib/utils';

// The boundary of every input from outside (RULES.md): the admin's fields, a list's URL, an import.

export const kopiyky = z.number().int().min(0);
export const madeToOrderDays = z.number().int().min(1).max(90);

type Product = {
  availability?: string | null;
  madeToOrderDays?: unknown;
  inci?: string | null;
  inciSource?: unknown;
};

export const hasDaysIfMadeToOrder = (product: Product) =>
  product.availability !== 'made_to_order' ||
  madeToOrderDays.safeParse(product.madeToOrderDays).success;

// INCI is copied from a source, never generated: the source is recorded with it (RULES.md).
export const hasInciSource = (product: Product) =>
  !product.inci?.trim() ||
  (typeof product.inciSource === 'string' && product.inciSource.trim() !== '');

export const productRules = z
  .object({
    price: kopiyky,
    availability: z.enum(AVAILABILITIES),
    madeToOrderDays: madeToOrderDays.nullish(),
    inci: z.string().nullish(),
    inciSource: z.string().nullish(),
  })
  .superRefine((product, ctx) => {
    if (!hasDaysIfMadeToOrder(product)) {
      ctx.addIssue({
        code: 'custom',
        path: ['madeToOrderDays'],
        message: 'days are required',
      });
    }
    if (!hasInciSource(product)) {
      ctx.addIssue({
        code: 'custom',
        path: ['inciSource'],
        message: 'INCI needs its source',
      });
    }
  });

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
// `?type=dry,oily` or `?type=dry&type=oily`; what is not a slug is dropped.
const slugs = z.preprocess(
  (value) => (Array.isArray(value) ? value.join(',') : value),
  z
    .string()
    .catch('')
    .transform((value) => [
      ...new Set(value.split(',').filter((slug) => /^[a-z0-9-]+$/.test(slug))),
    ]),
);

// A catalog list's URL parameters. A broken value is ignored, never an error: these links get
// shared, cut and edited by hand.
export const listingParams = z.object({
  type: slugs,
  condition: slugs,
  concern: slugs,
  brand: slugs,
  sort: z.preprocess(first, z.enum(SORTS).optional().catch(undefined)),
  page: z.preprocess(first, z.coerce.number().int().min(1).catch(1)),
});

// A cosmetika.com.ua product: only the fields the import reads; the rest of the answer is ignored.
const named = z.array(z.object({ name: z.string() }));
export const cosmetikaProduct = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  permalink: z.url(),
  description: z.string(),
  prices: z.object({
    price: z.string().regex(/^\d+$/),
    currency_code: z.literal('UAH'),
    currency_minor_unit: z.literal(2),
  }),
  images: z.array(z.object({ src: z.url() })),
  categories: named,
  brands: named,
});

// A page of cosmetika's answer: outside input too, its page count bounds the loop that reads them.
export const storePage = z.object({
  items: z.array(z.unknown()),
  pages: z.coerce.number().int().min(1).max(10),
});

// A portion of the import the admin page sends: a few cosmetika ids at a time.
export const importPortion = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(5),
});

// «Заповнити з AI»: a product's name and its brand's material, pasted by a person.
export const aiDraftRequest = z.object({
  name: z.string().trim().min(1, 'Спершу вкажіть назву товару').max(300),
  material: z
    .string()
    .trim()
    .min(100, 'Вставте щонайменше кілька речень матеріалу бренду')
    .max(30_000, 'Матеріал задовгий: вставте лише про цей товар'),
});

// What the model drafts from that material. No INCI: it is copied from a source, never generated
// (RULES.md), so the answer has nowhere to put one.
export const aiDraft = z.object({
  shortDescription: z.string(),
  purpose: z.string(),
  actives: z.array(z.object({ name: z.string(), role: z.string() })),
  howToUse: z.string(),
  warnings: z.string(),
});

// A row of the owner's price list.
export const priceRow = z.object({
  slug: z.string().trim().min(1, 'Немає адреси товару (slug)'),
  // An empty cell leaves the price as it is.
  price: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || parseHryvnias(value) !== null,
      'Ціна — не сума в гривнях, як 1245 або 1245,50',
    )
    .transform((value) => (value === '' ? null : parseHryvnias(value))),
});
