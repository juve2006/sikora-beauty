import { browserStore } from '@/lib/browser-store';
import { FAVORITES_LIMIT } from '@/lib/constants';

// A shopper's favorites: the ids of the products they marked, the newest first, kept in this
// browser (browser-store.ts). Ids, not slugs: the owner may change a slug.

const NONE: number[] = [];

// What the browser kept, as far as it is a list of products: anything else is no favorites.
export function parseFavorites(text: string | null) {
  try {
    const value: unknown = JSON.parse(text ?? '[]');
    if (!Array.isArray(value)) return NONE;
    const ids = value.filter(
      (id): id is number => Number.isSafeInteger(id) && id > 0,
    );
    return [...new Set(ids)].slice(0, FAVORITES_LIMIT);
  } catch {
    return NONE;
  }
}

// The list with the product added first, or taken out if it is there.
export const toggled = (ids: number[], id: number) =>
  ids.includes(id)
    ? ids.filter((other) => other !== id)
    : [id, ...ids].slice(0, FAVORITES_LIMIT);

const store = browserStore('favorites', parseFavorites);

export const useFavorites = store.use;

export const toggleFavorite = (id: number) =>
  store.write(toggled(store.read(), id));

// After the favorites page asked for `asked`: what the server did not return — deleted, or taken
// off the store — leaves the list. A product added meanwhile stays.
export function keepFavorites(asked: number[], found: number[]) {
  const ids = store.read();
  const kept = ids.filter((id) => !asked.includes(id) || found.includes(id));
  if (kept.length < ids.length) store.write(kept);
}
