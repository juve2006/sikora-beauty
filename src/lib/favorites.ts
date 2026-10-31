import { useSyncExternalStore } from 'react';

import { FAVORITES_LIMIT } from '@/lib/constants';

// A shopper's favorites: the ids of the products they marked, the newest first, kept in this
// browser's localStorage — no account, and a cookie would make every page dynamic. The server and
// the first render see none; the browser's list arrives on hydration. Another tab's change comes
// with the `storage` event. Ids, not slugs: the owner may change a slug.

const KEY = 'favorites';
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

const listeners = new Set<() => void>();
let kept: { text: string | null; ids: number[] } = { text: null, ids: NONE };
// Storage blocked (a private window): the list lasts until the page reloads.
let memory: number[] | null = null;

function read() {
  if (memory) return memory;
  let text: string | null;
  try {
    text = localStorage.getItem(KEY);
  } catch {
    return NONE;
  }
  // The same list for the same text: React re-renders when the snapshot changes.
  if (text !== kept.text) kept = { text, ids: parseFavorites(text) };
  return kept.ids;
}

function write(ids: number[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    memory = ids;
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  const other = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener();
  };
  listeners.add(listener);
  window.addEventListener('storage', other);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', other);
  };
}

export const useFavorites = () =>
  useSyncExternalStore(subscribe, read, () => NONE);

export const toggleFavorite = (id: number) => write(toggled(read(), id));

// After the favorites page asked for `asked`: what the server did not return — deleted, or taken
// off the store — leaves the list. A product added meanwhile stays.
export function keepFavorites(asked: number[], found: number[]) {
  const ids = read();
  const kept = ids.filter((id) => !asked.includes(id) || found.includes(id));
  if (kept.length < ids.length) write(kept);
}
