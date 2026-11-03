import { z } from 'zod';

import {
  AVAILABILITIES,
  CART_LINES,
  CART_QUANTITY_MAX,
  FAVORITES_LIMIT,
  PAYMENTS,
  RESERVED_SLUGS,
  ROLES,
  SORTS,
} from '@/lib/constants';
import { routing } from '@/i18n/routing';
import { parseHryvnias } from '@/lib/utils';
import type { AccountField } from '@/types';

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

// A Ukrainian number however it is typed — 067 123-45-67, 380671234567, +38 (067)… — kept as
// +380671234567, so it can be dialled from Telegram or the admin with one tap.
export const phone = z
  .string()
  .transform((value) => value.replace(/[\s().-]/g, ''))
  .pipe(z.string().regex(/^(\+?38)?0\d{9}$/, 'phoneInvalid'))
  .transform((value) => `+38${value.slice(-10)}`);

// The care finder's answers in `/care-finder?a=` (the first, if repeated) and in a consultation
// request: Payload's ids of the answers' rows, comma-joined. Anything else is no answers.
export const finderAnswers = z
  .preprocess(
    first,
    z
      .string()
      .max(2000)
      .transform((value) => value.split(','))
      .pipe(
        z
          .array(z.string().regex(/^[a-f0-9]{24}$/))
          .min(1)
          .max(50),
      ),
  )
  .catch([]);

// A shopper's consultation request: the form checks it before sending, the server action again.
// A message is a key of `Consultation.errors` in messages/*.json, translated by the form.
export const consultationRequest = z.object({
  name: z.string().trim().min(1, 'nameRequired').max(100, 'nameLong'),
  phone,
  message: z
    .string()
    .trim()
    .max(1000, 'messageLong')
    .transform((value) => value || undefined)
    .optional(),
  // The hidden fields the shopper does not type: a broken one is dropped, never shown as an error.
  product: z.coerce.number().int().positive().optional().catch(undefined),
  answers: finderAnswers,
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
    answers: field('answers'),
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

// Payload's `/api/users/me`, asked by the browser: who is signed in to the admin, if anyone.
export const adminSession = z.object({
  user: z.object({ role: z.enum(ROLES) }).nullable(),
});

// A page's address, not a section's (RESERVED_SLUGS).
export const pageSlug = z
  .string()
  .refine((slug) => !(RESERVED_SLUGS as readonly string[]).includes(slug));

// A link the owner types into a page: a path of this store, never another site — `//host` and
// `/\host` are one to a browser.
export const internalPath = z.string().regex(/^\/(?![/\\])[^\s\\]*$/);

// What a shopper searches for, from the header's suggestions or the results page's `?q=` (the first,
// if repeated): cut to a hundred characters; under two it is no query yet.
export const searchQuery = z.preprocess(
  first,
  z
    .string()
    .transform((value) => value.trim().slice(0, 100))
    .pipe(z.string().min(2)),
);
export const searchRequest = z.object({
  query: searchQuery,
  locale: z.enum(routing.locales),
});

// The favorites' and the cart's question: the cards of the products a browser kept.
export const cardsRequest = z.object({
  ids: z.array(z.number().int().positive()).max(FAVORITES_LIMIT),
  locale: z.enum(routing.locales),
});

// One line of a cart: a product and how many of it, as an order sends it.
export const cartLine = z.object({
  id: z.number().int().positive(),
  qty: z.number().int().min(1).max(CART_QUANTITY_MAX),
});
// A line as the browser kept it: more than the most is the most.
export const keptCartLine = cartLine.extend({
  qty: z
    .number()
    .int()
    .min(1)
    .transform((qty) => Math.min(qty, CART_QUANTITY_MAX)),
});

const text = (max: number) =>
  z.string().trim().min(1, 'required').max(max, 'long');
const json = (value: unknown) => {
  try {
    return JSON.parse(String(value));
  } catch {
    return undefined;
  }
};
// An NP reference as the API writes it; a hidden field left empty is none.
const npRef = z.preprocess((value) => value || undefined, z.guid().optional());

// A shopper's order: the checkout form checks it before sending, `placeOrder` again. A message is a
// key of `Checkout.errors` in messages/*.json, translated by the form. Nothing here is a price: the
// server reads them (RULES.md); `total` is only the sum the shopper was shown, to be compared.
export const orderRequest = z.object({
  firstName: text(50),
  lastName: text(50),
  phone,
  // The settlement and the NP warehouse: chosen from Nova Poshta's search, with their refs, or
  // typed by hand while the search does not work.
  settlement: text(200),
  warehouse: text(200),
  payment: z.enum(PAYMENTS, 'paymentRequired'),
  comment: z
    .string()
    .trim()
    .max(500, 'long')
    .transform((value) => value || undefined)
    .optional(),
  // The hidden fields the shopper does not type: a broken one fails the order, never a field.
  lines: z.preprocess(
    json,
    z
      .array(cartLine)
      .min(1)
      .max(CART_LINES)
      .refine(
        (lines) => new Set(lines.map(({ id }) => id)).size === lines.length,
      ),
  ),
  total: z.coerce.number().pipe(kopiyky),
  settlementRef: npRef,
  warehouseRef: npRef,
  locale: z.enum(routing.locales).catch(routing.defaultLocale),
  token: z.string().max(2048).optional().catch(undefined),
});

// The checkout form's fields by name, Turnstile's `cf-turnstile-response` among them: the order, or
// the error keys of each field the shopper typed — none when only a hidden field is broken.
export const parseOrderForm = (form: FormData) => {
  const field = (name: string) => form.get(name) ?? undefined;
  const result = orderRequest.safeParse({
    firstName: field('firstName'),
    lastName: field('lastName'),
    phone: field('phone'),
    settlement: field('settlement'),
    warehouse: field('warehouse'),
    payment: field('payment'),
    comment: field('comment'),
    lines: field('lines'),
    total: field('total'),
    settlementRef: field('settlementRef'),
    warehouseRef: field('warehouseRef'),
    locale: field('locale'),
    token: field('cf-turnstile-response'),
  });
  if (result.success) return { data: result.data };
  const {
    firstName,
    lastName,
    phone,
    settlement,
    warehouse,
    payment,
    comment,
  } = z.flattenError(result.error).fieldErrors;
  const errors = {
    firstName,
    lastName,
    phone,
    settlement,
    warehouse,
    payment,
    comment,
  };
  return {
    errors: Object.fromEntries(
      Object.entries(errors).filter(([, keys]) => keys),
    ) as Partial<typeof errors>,
  };
};

// What a shopper types to find their settlement, and then their NP warehouse in it — an empty
// query lists the first warehouses.
export const settlementQuery = z.string().trim().min(2).max(50);
export const warehouseQuery = z.object({
  ref: z.guid(),
  query: z.string().trim().max(50),
});

// Nova Poshta's answer to any method: HTTP 200 even when it failed; `success` says which. `info`
// is left out: an array in one answer, an object in another.
export const npAnswer = z.object({
  success: z.boolean(),
  data: z.array(z.unknown()),
  errors: z.array(z.string()).catch([]),
});
// `searchSettlements`: one result, whose `Addresses` are the matches; `Warehouses` is how many
// NP warehouses the settlement has.
export const npSettlements = z
  .array(
    z.object({
      Addresses: z.array(
        z.object({
          Ref: z.guid(),
          Present: z.string(),
          Warehouses: z.coerce.number(),
        }),
      ),
    }),
  )
  .max(1);
// `getWarehouses`: an NP warehouse — a branch or a parcel locker — and whether a parcel can be
// sent to it: `DenyToSelect` is "1" when not.
export const npWarehouses = z.array(
  z.object({
    Ref: z.guid(),
    Description: z.string(),
    WarehouseStatus: z.string(),
    DenyToSelect: z.coerce.string(),
  }),
);

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'long')
  .pipe(z.email('emailInvalid'));
// Payload refuses a blank password when it signs in, so one is never set.
const newPassword = z
  .string()
  .max(200, 'long')
  .refine((value) => value.trim().length >= 8, 'passwordShort');
const turnstileToken = z.string().max(2048).optional().catch(undefined);

// A shopper's account: each form checks its schema before sending, its server action again. A
// message is a key of `Account.errors` in messages/*.json, translated by the form.
export const signInRequest = z.object({
  email,
  // Whatever a password was when it was set: only the length a hash is worth computing for.
  password: z
    .string()
    .max(200, 'long')
    .refine((value) => value.trim(), 'required'),
  // From a letter's link (`/account/verify`).
  token: z
    .string()
    .regex(/^[a-f0-9]{40}$/)
    .optional()
    .catch(undefined),
});
export const registerRequest = z.object({
  firstName: text(50),
  lastName: text(50),
  email,
  password: newPassword,
  locale: z.enum(routing.locales).catch(routing.defaultLocale),
  token: turnstileToken,
});
// «Надіслати лист ще раз» and «Забули пароль?».
export const emailRequest = z.object({ email, token: turnstileToken });
// What Payload puts in a letter's link: 20 random bytes in hex.
export const accountToken = z.preprocess(
  first,
  z.string().regex(/^[a-f0-9]{40}$/),
);
export const passwordReset = z.object({
  token: accountToken,
  password: newPassword,
});
export const profileUpdate = z.object({
  firstName: text(50),
  lastName: text(50),
  // Optional, and clearing it clears it.
  phone: z.preprocess((value) => value || null, phone.nullable()),
});

// A form's fields by name, Turnstile's own `cf-turnstile-response` as `token`: the data, or the error
// keys of each field the shopper typed.
export const parseAccountForm = <Schema extends z.ZodObject>(
  schema: Schema,
  form: FormData,
) => {
  const result = schema.safeParse({
    token: form.get('cf-turnstile-response') ?? undefined,
    ...Object.fromEntries(form),
  });
  return result.success
    ? { data: result.data }
    : {
        errors: z.flattenError(result.error).fieldErrors as Partial<
          Record<AccountField, string[]>
        >,
      };
};
