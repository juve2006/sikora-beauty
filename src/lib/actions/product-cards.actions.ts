'use server';

import { cardsRequest } from '@/lib/validators';
import { getListingProducts } from '@/lib/actions/product.actions';

// The cards of the products a browser kept — the favorites page's and the cart's — in the order it
// kept them: published products only, with today's price and availability. One it does not get
// back is gone from the browser's list. A request it cannot read fails rather than answer with
// none: the page would take every asked id out.
export async function productCards(ids: number[], locale: string) {
  const parsed = cardsRequest.parse({ ids, locale });
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
