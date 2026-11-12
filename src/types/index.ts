import type { z } from 'zod';

import type {
  AVAILABILITIES,
  FACET_KEYS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENTS,
  SORTS,
  VOLUME_UNITS,
} from '@/lib/constants';
import type { getBrands, getMenu } from '@/lib/actions/category.actions';
import type { listing } from '@/lib/listing';
import type {
  aiDraft,
  cartLine,
  consultationRequest,
  cosmetikaProduct,
  listingParams,
  productRules,
} from '@/lib/validators';
import type { Page, Product } from '@/payload-types';

export type ProductRules = z.infer<typeof productRules>;
export type ListingParams = z.infer<typeof listingParams>;
export type CosmetikaProduct = z.infer<typeof cosmetikaProduct>;
export type AiDraft = z.infer<typeof aiDraft>;
export type ConsultationRequest = z.infer<typeof consultationRequest>;

// What the consultation form shows after a submit: the error keys of each field the shopper typed.
export type ConsultationState =
  | { status: 'idle' | 'failed' | 'sent' }
  | {
      status: 'invalid';
      errors: Partial<Record<'name' | 'phone' | 'message', string[]>>;
    };

// A cart's line in the browser, and what the checkout form shows after a submit: the error keys of
// each field the shopper typed, or that the cart changed under the order, or the order's number.
export type CartLine = z.infer<typeof cartLine>;
export type OrderContact = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
};
export type OrderField =
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'settlement'
  | 'warehouse'
  | 'payment'
  | 'comment'
  | 'email';
// `pay`: a card's invoice is made, and the browser goes to monobank's page at `url`.
export type OrderState =
  | { status: 'idle' | 'failed' | 'changed' }
  | { status: 'invalid'; errors: Partial<Record<OrderField, string[]>> }
  | { status: 'placed'; number: number; token: string }
  | { status: 'pay'; url: string };
// `payByCard`'s answer: the page to pay on; the order's payment turned to a link the manager sends,
// as its first invoice was not made; or no page — nothing to pay any more, an old invoice still
// alive, or a new one not made or not kept.
export type CardPaymentState =
  { status: 'pay'; url: string } | { status: 'link' | 'none' };
// Where a shopper who chose a transfer sends the money.
export type PaymentDetails = { recipient: string; iban: string; code: string };
// What an account's forms show after a submit: the error keys of each field the shopper typed, or
// how it went. One state for them all: each form answers the ones its action returns.
export type AccountField =
  'firstName' | 'lastName' | 'email' | 'password' | 'phone' | 'token';
export type AccountState =
  | {
      status:
        | 'idle'
        | 'failed'
        | 'wrong'
        | 'locked'
        | 'expired'
        | 'saved'
        | 'changed'
        | 'staff'
        | 'customer';
    }
  | { status: 'sent' | 'unverified'; email: string }
  | { status: 'invalid'; errors: Partial<Record<AccountField, string[]>> };
// A settlement or an NP warehouse found for what the shopper typed; `latin` when they typed Latin
// letters, which Nova Poshta refuses; `unavailable` when it did not answer.
export type DeliveryOption = { ref: string; label: string };
export type DeliveryAnswer =
  | { status: 'found'; options: DeliveryOption[] }
  | { status: 'latin' | 'unavailable' };

export type Availability = (typeof AVAILABILITIES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type Payment = (typeof PAYMENTS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type VolumeUnit = (typeof VOLUME_UNITS)[number];
export type FacetKey = (typeof FACET_KEYS)[number];
export type Sort = (typeof SORTS)[number];

// The care finder as the storefront reads it: each answer with the skin terms it means, by the
// catalog's facet key, and the routine's steps with their categories' ids.
export type SkinKey = Exclude<FacetKey, 'brand'>;
export type SkinTerm = { slug: string; title: string };
export type FinderAnswer = {
  id: string;
  label: string;
  terms: Record<SkinKey, SkinTerm[]>;
};
export type FinderQuestion = {
  id: string;
  question: string;
  hint?: string;
  multiple: boolean;
  answers: FinderAnswer[];
};
export type FinderStep = { id: string; title: string; categories: number[] };
export type Finder = {
  enabled: boolean;
  questions: FinderQuestion[];
  steps: FinderStep[];
};

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
// A product as search reads it: every text a shopper may type for it, in both languages.
export type SearchDoc = { id: number; name: string; texts: string[] };
export type Menu = Awaited<ReturnType<typeof getMenu>>;
export type BrandList = Awaited<ReturnType<typeof getBrands>>;

// A page's block, by its kind.
export type PageBlock = NonNullable<Page['blocks']>[number];
export type BlockOf<T extends PageBlock['blockType']> = Extract<
  PageBlock,
  { blockType: T }
>;
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
  id: number;
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
  page: string;
  volume?: number;
  volumeUnit?: VolumeUnit;
  inciSource?: string;
  warnings: string[];
};
// What only a product's page holds.
export type ImportedOffer = {
  price: number;
  images: string[];
};

// A product's texts «Перекласти з української» and «Заповнити з AI» read and fill. The admin
// form's data holds an array without rows as its row count, 0.
type Active = {
  id?: string | null;
  name?: string | null;
  role?: string | null;
};
export type ProductTexts = {
  [K in 'name' | 'shortDescription' | 'purpose' | 'howToUse' | 'warnings']?:
    string | null;
} & { actives?: Active[] | number | null };
