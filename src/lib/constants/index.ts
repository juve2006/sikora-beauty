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

export const ROLES = ['owner', 'cosmetologist'] as const;
export const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  owner: 'Власник',
  cosmetologist: 'Косметолог',
};

export const AVAILABILITIES = [
  'in_stock',
  'made_to_order',
  'out_of_stock',
] as const;
// Whose texts a product carries: a draft by AI or by the import waits for a person to read it
// (adr-20261028-reviewed-ai-content-drafts).
export const REVIEWS = ['ai', 'imported', 'reviewed'] as const;
export const VOLUME_UNITS = ['ml', 'g', 'pcs'] as const;
// For the admin and the owner's price list; the storefront translates units through messages/*.json.
export const VOLUME_UNIT_LABELS: Record<(typeof VOLUME_UNITS)[number], string> =
  { ml: 'мл', g: 'г', pcs: 'шт' };

// A catalog list's filters, its orders besides the default one, and its page.
export const FACET_KEYS = ['type', 'condition', 'concern', 'brand'] as const;
export const SORTS = ['price-asc', 'price-desc', 'new'] as const;
export const PAGE_SIZE = 24;

// The storefront's collections: a fixed list, each the product flag that puts a product in it.
export const COLLECTIONS = {
  new: 'isNew',
  bestsellers: 'isBestseller',
  sets: 'isSet',
  minis: 'isMini',
} as const;

export const COSMETIKA_API =
  'https://cosmetika.com.ua/wp-json/wc/store/v1/products';
