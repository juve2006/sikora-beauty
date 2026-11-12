// Google wants canonical, hreflang and structured-data URLs fully qualified: the site's own address
// to resolve them against. Vercel's own addresses, the dev server locally.
// ponytail: the production host has no VERCEL_* variables; give it a SITE_URL then.
const host =
  process.env.VERCEL_ENV === 'production'
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL
    : process.env.VERCEL_URL;
export const SITE_URL = new URL(
  host ? `https://${host}` : `http://localhost:${process.env.PORT ?? 3000}`,
);

// A page's address may not be a storefront section's, whose route would hide the page, nor a
// language's or Payload's own path.
export const RESERVED_SLUGS = [
  'brand',
  'brands',
  'canvas',
  'care-finder',
  'cart',
  'catalog',
  'collection',
  'concern',
  'favorites',
  'product',
  'search',
  'skin-type',
  'account',
  'admin',
  'api',
  'uk',
  'en',
] as const;

export const ROLES = ['owner', 'cosmetologist'] as const;
export const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  owner: 'Власник',
  cosmetologist: 'Косметолог',
};

// How long a shopper stays signed in, and how seldom one account gets a reset letter: sooner, a
// request is answered as usual and sends nothing.
export const CUSTOMER_SESSION_SECONDS = 30 * 24 * 60 * 60;
export const LETTER_INTERVAL = 5 * 60 * 1000;
// The orders a shopper's account shows, the latest first.
export const CUSTOMER_ORDERS = 50;

export const AVAILABILITIES = [
  'in_stock',
  'made_to_order',
  'out_of_stock',
] as const;
// Whose texts a product carries: a draft by AI or by the import waits for a person to read it
// (adr-20261028-reviewed-ai-content-drafts).
export const REVIEWS = ['ai', 'imported', 'reviewed'] as const;
// A consultation request's way through: the cosmetologist takes it, calls, closes it.
export const CONSULTATION_STATUSES = ['new', 'in_progress', 'closed'] as const;
export const VOLUME_UNITS = ['ml', 'g', 'pcs'] as const;
// For the admin and the owner's price list; the storefront translates units through messages/*.json.
export const VOLUME_UNIT_LABELS: Record<(typeof VOLUME_UNITS)[number], string> =
  { ml: 'мл', g: 'г', pcs: 'шт' };

// A catalog list's filters, its orders besides the default one, and its page.
export const FACET_KEYS = ['type', 'condition', 'concern', 'brand'] as const;
export const SORTS = ['price-asc', 'price-desc', 'new'] as const;
export const PAGE_SIZE = 24;
// A routine's step shows at most this many products: a routine, not a list.
export const ROUTINE_STEP_PRODUCTS = 2;

// Search: the header's suggestions, the most the results page shows (no pages), and the most
// different queries «Пошук без результатів» keeps — anyone can send one.
export const SUGGESTIONS = 6;
export const SEARCH_LIMIT = 48;
export const SEARCH_MISSES = 1000;

// The most products a browser keeps in favorites: the oldest goes when a new one comes.
export const FAVORITES_LIMIT = 100;

// A cart: the most lines a browser keeps, and the most of one product a line orders.
export const CART_LINES = 50;
export const CART_QUANTITY_MAX = 10;

// The order sum, in kopiyky, from which the store pays the delivery: the header's strip, the product
// page and the checkout say so; the seller makes that waybill with the sender paying (task
// `header-hero`).
export const FREE_DELIVERY_FROM = 350_000;

// The longest text Telegram takes: it refuses a longer one, and the whole message with it.
export const TELEGRAM_TEXT_LIMIT = 4096;

// An order's way through, only forward (RULES.md): the manager confirms it, sends it, it is
// received — or it is cancelled before that.
export const ORDER_STATUSES = [
  'new',
  'confirmed',
  'shipped',
  'completed',
  'cancelled',
] as const;
// Cash on delivery, a monobank link the manager sends after confirming, a transfer to the store's
// account, or a card on monobank's page — the last two only for an order wholly in stock
// (adr-20261028-two-step-launch).
export const PAYMENTS = ['cod', 'link', 'transfer', 'card'] as const;
// What the checkout offers: the store starts on prepayment alone, and cash on delivery comes back
// later. It stays in `PAYMENTS` for the orders that were placed with it.
export const CHECKOUT_PAYMENTS = ['link', 'transfer', 'card'] as const;
// Whether an order is paid, apart from its status: only forward (RULES.md) — the manager marks it,
// and monobank for a card.
export const PAYMENT_STATUSES = [
  'awaiting',
  'paid',
  'failed',
  'refunded',
] as const;

// monobank acquiring's API; MONO_API_URL replaces it for the e2e tests' stub.
export const MONO_API = 'https://api.monobank.ua';
// The daily reconciliation leaves an invoice younger than the first to its shopper's return, gives
// up on one older than the second, as mono cannot answer for it, and asks of at most the third, the
// oldest first: within what a Vercel function may take.
export const RECONCILE_AFTER = 10 * 60_000;
export const RECONCILE_WITHIN = 7 * 24 * 60 * 60_000;
export const RECONCILE_LIMIT = 20;

// A parcel's box as the waybill form starts it, in kilograms and centimetres.
export const WAYBILL_BOX = {
  weight: '0.5',
  width: '20',
  length: '30',
  height: '10',
};
export const WAYBILL_STATUSES = ['confirmed', 'shipped'] as const;
// How long a waybill's request must be gone before the manager may send it again: longer than the
// 15 seconds Nova Poshta is given, so a second tab never repeats one still on its way.
export const WAYBILL_AGAIN_AFTER = 60_000;
// The daily tracking asks of at most the first, Nova Poshta's limit for one request, the oldest
// first, and lets go of an order older than the second.
export const TRACK_LIMIT = 100;
export const TRACK_WITHIN = 60 * 24 * 60 * 60_000;
// Nova Poshta's status codes: deleted in its cabinet, and so free to be made again; the ones after
// which nothing more happens, any code not named here being still on its way; and a parcel nobody
// collected, which the manager is told of.
export const DELIVERY_DELETED = '2';
export const DELIVERY_FINAL = [
  DELIVERY_DELETED,
  '9',
  '10',
  '11',
  '102',
  '103',
  '106',
];
export const DELIVERY_NOT_COLLECTED = ['102', '103', '105'];

// Nova Poshta's API 2.0; NOVA_POSHTA_API_URL replaces it for the e2e tests' stub.
export const NOVA_POSHTA_API = 'https://api.novaposhta.ua/v2.0/json/';

// The storefront's collections: a fixed list, each the product flag that puts a product in it.
export const COLLECTIONS = {
  new: 'isNew',
  bestsellers: 'isBestseller',
  sets: 'isSet',
  minis: 'isMini',
} as const;

// The menus' «За потребами шкіри» and «Набори та новинки», hidden at the owner's word of 2026-11-12,
// who may want them back: `true` returns them. Their pages and the catalog's filters stay.
export const SHOW_CONCERNS_AND_COLLECTIONS = false;

export const COSMETIKA_API =
  'https://www.cosmetika.com.ua/wp-json/wp/v2/product';
