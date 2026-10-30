import { z } from 'zod';

import { AVAILABILITIES, SORTS } from '@/lib/constants';
import { routing } from '@/i18n/routing';
import { parseHryvnias } from '@/lib/utils';

// The boundary of every input from outside (RULES.md): the admin's fields, a list's URL, an import,
// a shopper's form.

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

// A shopper's consultation request: the form checks it before sending, the server action again.
// A message is a key of `Consultation.errors` in messages/*.json, translated by the form.
export const consultationRequest = z.object({
  name: z.string().trim().min(1, 'nameRequired').max(100, 'nameLong'),
  // A Ukrainian number however it is typed — 067 123-45-67, 380671234567, +38 (067)… — kept as
  // +380671234567, so it can be dialled from Telegram with one tap.
  phone: z
    .string()
    .transform((value) => value.replace(/[\s().-]/g, ''))
    .pipe(z.string().regex(/^(\+?38)?0\d{9}$/, 'phoneInvalid'))
    .transform((value) => `+38${value.slice(-10)}`),
  message: z
    .string()
    .trim()
    .max(1000, 'messageLong')
    .transform((value) => value || undefined)
    .optional(),
  // The hidden fields the shopper does not type: a broken one is dropped, never shown as an error.
  product: z.coerce.number().int().positive().optional().catch(undefined),
  locale: z.enum(routing.locales).catch(routing.defaultLocale),
  token: z.string().max(2048).optional().catch(undefined),
});

// The form's fields by name, Turnstile's own `cf-turnstile-response` among them: the request, or
// the error keys of each field the shopper typed.
export const parseConsultationForm = (form: FormData) => {
  const field = (name: string) => form.get(name) ?? undefined;
  const result = consultationRequest.safeParse({
    name: field('name'),
    phone: field('phone'),
    message: field('message'),
    product: field('product'),
    locale: field('locale'),
    token: field('cf-turnstile-response'),
  });
  return result.success
    ? { data: result.data }
    : { errors: z.flattenError(result.error).fieldErrors };
};

// Cloudflare's answer to a Turnstile token.
export const turnstileAnswer = z.object({ success: z.boolean() });

// Telegram's answer to `sendMessage`: `ok`, and why not when it is false.
export const telegramAnswer = z.object({
  ok: z.boolean(),
  description: z.string().optional(),
});
