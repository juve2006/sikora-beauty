'use server';

import { favoritesRequest } from '@/lib/validators';
import { getListingProducts } from '@/lib/actions/product.actions';

// The favorites page's cards: the products a browser kept that are still published, with today's
// price, in the order it kept them. One it does not get back is gone from the store. A request it
// cannot read fails rather than answer with none: the page would take every asked id out.
export async function favoriteProducts(ids: number[], locale: string) {
  const parsed = favoritesRequest.parse({ ids, locale });
  if (parsed.ids.length === 0) return [];
  const products = await getListingProducts(
    { id: { in: parsed.ids } },
    parsed.locale,
  );
  return parsed.ids.flatMap((id) => {
    const product = products.find((product) => product.id === id);
    return product ? [{ id, card: product.card }] : [];
  });
}
