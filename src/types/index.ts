import type { z } from 'zod';

import type { getListingProducts } from '@/lib/actions/product.actions';
import type {
  AVAILABILITIES,
  FACET_KEYS,
  SORTS,
  VOLUME_UNITS,
} from '@/lib/constants';
import type { listing } from '@/lib/listing';
import type {
  cosmetikaProduct,
  listingParams,
  productRules,
} from '@/lib/validators';
import type { Product } from '@/payload-types';

export type ProductRules = z.infer<typeof productRules>;
export type ListingParams = z.infer<typeof listingParams>;
export type CosmetikaProduct = z.infer<typeof cosmetikaProduct>;

export type Availability = (typeof AVAILABILITIES)[number];
export type VolumeUnit = (typeof VOLUME_UNITS)[number];
export type FacetKey = (typeof FACET_KEYS)[number];
export type Sort = (typeof SORTS)[number];

// A catalog list's view of a product and of its filters.
export type ListingProduct = {
  id: number;
  price: number;
  availability: Availability;
  createdAt: string;
  // The slugs of the product's terms, by facet.
  terms: Record<FacetKey, string[]>;
};
export type Facet = {
  key: FacetKey;
  values: { slug: string; title: string }[];
};
export type Listing = ReturnType<typeof listing>;
export type ListedProduct = Awaited<
  ReturnType<typeof getListingProducts>
>[number];
export type FilterProps = {
  facets: Listing['facets'];
  params: ListingParams;
  basePath: string;
};

export type CardProduct = Pick<
  Product,
  | 'name'
  | 'price'
  | 'volume'
  | 'volumeUnit'
  | 'availability'
  | 'madeToOrderDays'
> & {
  slug: string;
  brand: string;
  photo?: Photo;
};
export type Photo = { url: string; alt: string };

// The owner's price list.
export type PricedProduct = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  volume: string;
  price: number | null;
  // The latest version is a draft: a new price reaches the storefront once it is published.
  draft: boolean;
};
export type PriceChange = {
  id: number;
  slug: string;
  name: string;
  from: number | null;
  to: number;
  draft: boolean;
};
export type PricePlan = {
  changes: PriceChange[];
  errors: { line: number; message: string }[];
};

// A cosmetika.com.ua product as our draft would hold it.
export type ImportedTexts = {
  purpose?: string;
  howToUse?: string;
  inci?: string;
};
export type Imported = ImportedTexts & {
  name: string;
  slug: string;
  brand: string;
  categories: string[];
  isSet: boolean;
  price: number;
  volume?: number;
  volumeUnit?: VolumeUnit;
  inciSource?: string;
  images: string[];
  warnings: string[];
};

// A product's texts «Перекласти з української» reads and fills. The admin form's data holds an
// array without rows as its row count, 0.
type Active = {
  id?: string | null;
  name?: string | null;
  role?: string | null;
};
export type ProductTexts = {
  [K in 'name' | 'shortDescription' | 'purpose' | 'howToUse' | 'warnings']?:
    string | null;
} & { actives?: Active[] | number | null };
