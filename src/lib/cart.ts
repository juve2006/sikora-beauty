import { browserStore } from '@/lib/browser-store';
import { CART_LINES, CART_QUANTITY_MAX } from '@/lib/constants';
import { keptCartLine } from '@/lib/validators';
import type { CartLine } from '@/types';

// A shopper's cart: products and how many of each, the newest line first, kept in this browser
// (browser-store.ts). Ids and quantities only: names and prices come from the server, which
// reprices the order anyway (RULES.md).

const NONE: CartLine[] = [];

// What the browser kept, as far as it is a cart: a line that is not a product and a quantity goes,
// and so does a product's second line.
export function parseCart(text: string | null) {
  try {
    const value: unknown = JSON.parse(text ?? '[]');
    if (!Array.isArray(value)) return NONE;
    const lines: CartLine[] = [];
    for (const item of value) {
      const line = keptCartLine.safeParse(item);
      if (line.success && !lines.some(({ id }) => id === line.data.id))
        lines.push(line.data);
    }
    return lines.slice(0, CART_LINES);
  } catch {
    return NONE;
  }
}

// The cart with the product's quantity set, between one and the most.
export const withQuantity = (lines: CartLine[], id: number, qty: number) =>
  lines.map((line) =>
    line.id === id
      ? { id, qty: Math.min(Math.max(qty, 1), CART_QUANTITY_MAX) }
      : line,
  );

// The cart with one more of the product: its line grows, or a new one comes first — past the most
// lines, the oldest goes.
export function added(lines: CartLine[], id: number) {
  const line = lines.find((line) => line.id === id);
  return line
    ? withQuantity(lines, id, line.qty + 1)
    : [{ id, qty: 1 }, ...lines].slice(0, CART_LINES);
}

export const without = (lines: CartLine[], id: number) =>
  lines.filter((line) => line.id !== id);

const store = browserStore('cart', parseCart);

export const useCart = store.use;

export const addToCart = (id: number) => store.write(added(store.read(), id));
export const setQuantity = (id: number, qty: number) =>
  store.write(withQuantity(store.read(), id, qty));
export const removeFromCart = (id: number) =>
  store.write(without(store.read(), id));

// After the cart page asked for `asked`: what the server did not return — deleted, or taken off the
// store — leaves the cart. Returns how many lines left, so the page can say so.
export function keepCart(asked: number[], found: number[]) {
  const lines = store.read();
  const kept = lines.filter(
    ({ id }) => !asked.includes(id) || found.includes(id),
  );
  if (kept.length < lines.length) store.write(kept);
  return lines.length - kept.length;
}

// After an order: its lines leave the cart. A line it did not take — out of stock — stays.
export const dropOrdered = (ids: number[]) =>
  store.write(store.read().filter(({ id }) => !ids.includes(id)));
