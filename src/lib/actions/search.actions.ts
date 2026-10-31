import 'server-only';

import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

import type { Config } from '@/payload-types';
import type { SearchDoc } from '@/types';
import { getListingProducts } from '@/lib/actions/product.actions';
import { SEARCH_MISSES } from '@/lib/constants';
import { findProducts, spellings } from '@/lib/search';

type Locale = Config['locale'];

// A localized field read with `locale: 'all'`: its text in each language that has one.
const texts = (value: unknown) =>
  typeof value === 'string'
    ? [value]
    : Object.values(value ?? {}).filter(
        (text): text is string => typeof text === 'string',
      );

// What search reads: every published product's names in both languages, its brand and its actives,
// and the synonyms. A shopper types in either language whichever page they are on; equal matches
// are ordered by the name the page shows.
// ponytail: every published product on each search, as listing.ts does; Postgres trigram indexes
// when the catalog holds thousands (adr-20261031-search-in-memory).
const searchIndex = cache(async (locale: Locale) => {
  const payload = await getPayload({ config });
  const [products, synonyms] = await Promise.all([
    payload.find({
      collection: 'products',
      locale: 'all',
      depth: 1,
      pagination: false,
      overrideAccess: false,
      select: { name: true, brand: true, actives: true },
      populate: { brands: { name: true } },
    }),
    payload.find({
      collection: 'search-synonyms',
      depth: 0,
      pagination: false,
      overrideAccess: false,
      select: { spellings: true },
    }),
  ]);
  const docs: SearchDoc[] = products.docs.map((product) => ({
    id: product.id,
    name:
      (product.name as unknown as Partial<Record<Locale, string>>)[locale] ??
      texts(product.name)[0] ??
      '',
    texts: [
      ...texts(product.name),
      ...(typeof product.brand === 'object' ? [product.brand.name] : []),
      ...(product.actives ?? []).flatMap((active) => texts(active.name)),
    ],
  }));
  return {
    docs,
    synonyms: synonyms.docs.map((group) => spellings(group.spellings)),
  };
});

// The products a query finds, the closest first, as the catalog's cards; `total` counts every one.
export async function searchProducts(
  query: string,
  locale: Locale,
  limit: number,
) {
  const { docs, synonyms } = await searchIndex(locale);
  const ids = findProducts(docs, query, synonyms);
  const shown = ids.slice(0, limit);
  const products =
    shown.length > 0
      ? await getListingProducts({ id: { in: shown } }, locale)
      : [];
  return {
    total: ids.length,
    products: shown.flatMap(
      (id) => products.find((product) => product.id === id) ?? [],
    ),
  };
}

// A query the results page found nothing for, counted. Only this writes the misses — their create
// and update are closed to everyone — so the Local API's access is skipped. A new query past
// SEARCH_MISSES is dropped, so a script cannot grow the table. A failure is logged without the
// query or the database's detail: a shopper may type anything into search.
export async function recordSearchMiss(query: string, locale: Locale) {
  const text = query.toLowerCase().replace(/\s+/g, ' ');
  try {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: 'search-misses',
      where: { query: { equals: text } },
      depth: 0,
      limit: 1,
      select: { count: true },
    });
    if (docs[0])
      await payload.update({
        collection: 'search-misses',
        id: docs[0].id,
        data: { count: docs[0].count + 1 },
        depth: 0,
      });
    else if (
      (await payload.count({ collection: 'search-misses' })).totalDocs <
      SEARCH_MISSES
    )
      await payload.create({
        collection: 'search-misses',
        data: { query: text, count: 1, locale },
        depth: 0,
      });
  } catch (error) {
    const { message, cause } = error as {
      message?: string;
      cause?: { message?: string };
    };
    console.error('Search miss:', cause?.message ?? message?.split('\n')[0]);
  }
}
