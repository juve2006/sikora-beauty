import 'server-only';

import config from '@payload-config';
import { getPayload, type Where } from 'payload';
import { cache } from 'react';

import type { Config, Product } from '@/payload-types';

import type { ListingProduct } from '@/types';
import { brandName, productPhotos } from '@/lib/product-page';

// The storefront's reads of the catalog: published products only — the Local API skips access
// control unless told not to (RULES.md) — in the page's language, with the Ukrainian fallback.

type Locale = Config['locale'];

// Cached per request: the page and its metadata read the same product.
export const getProduct = cache(async (slug: string, locale: Locale) => {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    locale,
    depth: 1,
    limit: 1,
    overrideAccess: false,
    // Related products are read by getRelated, with what a card shows.
    populate: { products: { slug: true } },
  });
  return docs[0] ?? null;
});

// A related product still in draft is left out; the rest keep the cosmetologist's order.
export async function getRelated(product: Product, locale: Locale) {
  const ids = (product.related ?? []).map((related) =>
    typeof related === 'object' ? related.id : related,
  );
  if (ids.length === 0) return [];
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'products',
    where: { id: { in: ids } },
    locale,
    depth: 1,
    limit: ids.length,
    overrideAccess: false,
    select: {
      name: true,
      slug: true,
      brand: true,
      price: true,
      volume: true,
      volumeUnit: true,
      availability: true,
      madeToOrderDays: true,
      shortDescription: true,
      images: true,
    },
  });
  return docs.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
}

const termSlugs = (
  terms: (number | { slug?: string | null } | null)[] | null | undefined,
) =>
  (terms ?? []).flatMap((term) =>
    term && typeof term === 'object' && term.slug ? [term.slug] : [],
  );

// Every published product a list may show, with what its card shows and its terms' slugs.
// ponytail: the whole zone in memory for listing.ts; a query per facet when a zone holds thousands.
export async function getListingProducts(where: Where, locale: Locale) {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'products',
    where,
    locale,
    depth: 1,
    pagination: false,
    overrideAccess: false,
    select: {
      name: true,
      slug: true,
      brand: true,
      price: true,
      volume: true,
      volumeUnit: true,
      availability: true,
      madeToOrderDays: true,
      shortDescription: true,
      images: true,
      createdAt: true,
      categories: true,
      skinTypes: true,
      skinConditions: true,
      skinConcerns: true,
    },
    populate: {
      brands: { name: true, slug: true },
      categories: { slug: true },
      'skin-types': { slug: true },
      'skin-conditions': { slug: true },
      'skin-concerns': { slug: true },
    },
  });
  return docs.map((product) => ({
    id: product.id,
    price: product.price,
    availability: product.availability,
    createdAt: product.createdAt,
    categories: (product.categories ?? []).map((category) =>
      typeof category === 'object' ? category.id : category,
    ),
    terms: {
      type: termSlugs(product.skinTypes),
      condition: termSlugs(product.skinConditions),
      concern: termSlugs(product.skinConcerns),
      brand: termSlugs([product.brand]),
    },
    card: {
      id: product.id,
      name: product.name,
      slug: product.slug ?? String(product.id),
      brand: brandName(product.brand) ?? '',
      price: product.price,
      volume: product.volume,
      volumeUnit: product.volumeUnit,
      availability: product.availability,
      madeToOrderDays: product.madeToOrderDays,
      shortDescription: product.shortDescription,
      photo: productPhotos(product.images)[0],
    },
  })) satisfies ListingProduct[];
}
