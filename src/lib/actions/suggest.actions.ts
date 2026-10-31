'use server';

import { SUGGESTIONS } from '@/lib/constants';
import { searchRequest } from '@/lib/validators';
import { searchProducts } from '@/lib/actions/search.actions';

// The header's suggestions as a shopper types: the closest products' cards, nothing under two
// characters. A miss is never recorded here — half-typed words would fill the list; the results
// page records it.
export async function suggestProducts(query: string, locale: string) {
  const parsed = searchRequest.safeParse({ query, locale });
  if (!parsed.success) return [];
  const { products } = await searchProducts(
    parsed.data.query,
    parsed.data.locale,
    SUGGESTIONS,
  );
  return products.map(({ card }) => card);
}
