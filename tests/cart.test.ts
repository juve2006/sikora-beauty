import { afterEach, describe, expect, it, vi } from 'vitest';

import { browserStore } from '@/lib/browser-store';
import {
  addToCart,
  added,
  dropOrdered,
  keepCart,
  parseCart,
  withQuantity,
  without,
} from '@/lib/cart';
import { CART_LINES, CART_QUANTITY_MAX } from '@/lib/constants';

const lines = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: i + 1, qty: 1 }));

// localStorage as a browser has it, for the store's own functions.
function storage() {
  const items = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
  });
  return items;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseCart', () => {
  it('reads the lines the browser kept', () => {
    expect(parseCart('[{"id":3,"qty":2},{"id":1,"qty":1}]')).toEqual([
      { id: 3, qty: 2 },
      { id: 1, qty: 1 },
    ]);
  });

  it('takes nothing it cannot trust for a line', () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart('not json')).toEqual([]);
    expect(parseCart('{"id":3,"qty":1}')).toEqual([]);
    expect(
      parseCart(
        '[{"id":3,"qty":1},{"id":"4","qty":1},{"id":5,"qty":0},{"id":6,"qty":1.5},{"id":-1,"qty":1},null,7,{"id":3,"qty":4},{"id":8,"qty":2}]',
      ),
    ).toEqual([
      { id: 3, qty: 1 },
      { id: 8, qty: 2 },
    ]);
  });

  it('cuts a quantity to the most, and the lines to the limit', () => {
    expect(parseCart('[{"id":3,"qty":500}]')).toEqual([
      { id: 3, qty: CART_QUANTITY_MAX },
    ]);
    expect(parseCart(JSON.stringify(lines(CART_LINES + 5)))).toHaveLength(
      CART_LINES,
    );
  });
});

describe('the cart lines', () => {
  it('puts a new product first and adds one more of a kept one, up to the most', () => {
    expect(added([{ id: 3, qty: 1 }], 7)).toEqual([
      { id: 7, qty: 1 },
      { id: 3, qty: 1 },
    ]);
    expect(added([{ id: 3, qty: 2 }], 3)).toEqual([{ id: 3, qty: 3 }]);
    expect(added([{ id: 3, qty: CART_QUANTITY_MAX }], 3)).toEqual([
      { id: 3, qty: CART_QUANTITY_MAX },
    ]);
  });

  it('drops the oldest line past the limit', () => {
    const next = added(lines(CART_LINES), 999);
    expect(next).toHaveLength(CART_LINES);
    expect(next[0]).toEqual({ id: 999, qty: 1 });
    expect(next.at(-1)?.id).toBe(CART_LINES - 1);
  });

  it('sets a quantity between one and the most, and takes a line out', () => {
    const cart = [
      { id: 3, qty: 2 },
      { id: 1, qty: 1 },
    ];
    expect(withQuantity(cart, 3, 0)).toEqual([
      { id: 3, qty: 1 },
      { id: 1, qty: 1 },
    ]);
    expect(withQuantity(cart, 1, 99)).toEqual([
      { id: 3, qty: 2 },
      { id: 1, qty: CART_QUANTITY_MAX },
    ]);
    expect(without(cart, 3)).toEqual([{ id: 1, qty: 1 }]);
  });
});

describe('the cart in the browser', () => {
  it('keeps what the shopper added, drops what the server did not return and what was ordered', () => {
    const items = storage();
    const kept = () => JSON.parse(items.get('cart') ?? '[]');
    addToCart(5);
    addToCart(5);
    addToCart(6);
    addToCart(7);
    expect(kept()).toEqual([
      { id: 7, qty: 1 },
      { id: 6, qty: 1 },
      { id: 5, qty: 2 },
    ]);
    // 7 was added after the page asked: it stays.
    expect(keepCart([5, 6], [6])).toBe(1);
    expect(kept()).toEqual([
      { id: 7, qty: 1 },
      { id: 6, qty: 1 },
    ]);
    dropOrdered([6]);
    expect(kept()).toEqual([{ id: 7, qty: 1 }]);
  });

  it('keeps the list in memory when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    const store = browserStore('blocked', parseCart);
    expect(store.read()).toEqual([]);
    store.write([{ id: 1, qty: 2 }]);
    expect(store.read()).toEqual([{ id: 1, qty: 2 }]);
  });
});
