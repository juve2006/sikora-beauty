import { FACET_KEYS, PAGE_SIZE } from '@/lib/constants';
import type {
  Facet,
  FacetKey,
  ListingParams,
  ListingProduct,
  Sort,
} from '@/types';

// A catalog list — a zone's, a category's, a skin concern's or a skin type's page — from every
// product the page may show: its filters with their counts, its order and its page. Payload counts
// nothing by value, and the whole catalog is a few hundred products (spec `sikora-beauty`).

// A facet's chosen slugs with one of them switched.
export const toggled = (chosen: string[], slug: string) =>
  chosen.includes(slug)
    ? chosen.filter((value) => value !== slug)
    : [...chosen, slug];

// The query string of the list after a change; a new filter or order starts again from the first
// page. Commas stay as they are: slugs need no escaping.
export function listingSearch(
  params: ListingParams,
  change: Partial<ListingParams>,
) {
  const next = { ...params, page: 1, ...change };
  const parts = FACET_KEYS.flatMap((key) =>
    next[key].length > 0 ? [`${key}=${next[key].join(',')}`] : [],
  );
  if (next.sort) parts.push(`sort=${next.sort}`);
  if (next.page > 1) parts.push(`page=${next.page}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

const stock = { in_stock: 0, made_to_order: 1, out_of_stock: 2 };
const newest = (a: ListingProduct, b: ListingProduct) =>
  b.createdAt.localeCompare(a.createdAt);
const orders: Record<
  Sort | 'default',
  (a: ListingProduct, b: ListingProduct) => number
> = {
  default: (a, b) =>
    stock[a.availability] - stock[b.availability] || newest(a, b),
  'price-asc': (a, b) => a.price - b.price || newest(a, b),
  'price-desc': (a, b) => b.price - a.price || newest(a, b),
  new: newest,
};

// Values of one facet are alternatives, facets narrow each other.
export function listing<T extends ListingProduct>(
  products: T[],
  facets: Facet[],
  params: ListingParams,
) {
  // A slug no facet offers, from an old link, is ignored rather than emptying the list.
  const chosen = facets.map((facet) => ({
    ...facet,
    chosen: params[facet.key].filter((slug) =>
      facet.values.some((value) => value.slug === slug),
    ),
  }));
  const passes = (product: T, skip?: FacetKey) =>
    chosen.every(
      ({ key, chosen }) =>
        key === skip ||
        chosen.length === 0 ||
        chosen.some((slug) => product.terms[key].includes(slug)),
    );

  const found = products
    .filter((product) => passes(product))
    .sort(orders[params.sort ?? 'default']);
  return {
    products: found.slice(
      (params.page - 1) * PAGE_SIZE,
      params.page * PAGE_SIZE,
    ),
    total: found.length,
    page: params.page,
    pageCount: Math.max(1, Math.ceil(found.length / PAGE_SIZE)),
    selected: chosen.reduce((sum, facet) => sum + facet.chosen.length, 0),
    // A value counts what the other facets leave, so choosing it never shows an empty list; one that
    // would is hidden unless chosen, and so is a facet left with no values.
    facets: chosen
      .map(({ key, values, chosen }) => {
        const pool = products.filter((product) => passes(product, key));
        const counted = values.map((value) => ({
          ...value,
          count: pool.filter((product) =>
            product.terms[key].includes(value.slug),
          ).length,
          selected: chosen.includes(value.slug),
        }));
        return {
          key,
          values: counted.filter((value) => value.count > 0 || value.selected),
        };
      })
      .filter((facet) => facet.values.length > 0),
  };
}
