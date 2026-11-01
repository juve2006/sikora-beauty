import { describe, expect, it, vi } from 'vitest';

import { productCards } from '@/lib/actions/product-cards.actions';
import { getListingProducts } from '@/lib/actions/product.actions';
import { FAVORITES_LIMIT } from '@/lib/constants';
import { parseFavorites, toggled } from '@/lib/favorites';
import { cardsRequest } from '@/lib/validators';
import type { CardProduct } from '@/types';

vi.mock('@/lib/actions/product.actions', () => ({
  getListingProducts: vi.fn(),
}));

describe('parseFavorites', () => {
  it('reads the ids the browser kept', () => {
    expect(parseFavorites('[3,1,2]')).toEqual([3, 1, 2]);
  });

  it('takes nothing it cannot trust for a list of products', () => {
    expect(parseFavorites(null)).toEqual([]);
    expect(parseFavorites('not json')).toEqual([]);
    expect(parseFavorites('{"3":true}')).toEqual([]);
    expect(parseFavorites('[3,"4",-1,0,2.5,3,null,7]')).toEqual([3, 7]);
  });

  it('keeps no more than the limit', () => {
    const many = JSON.stringify(
      Array.from({ length: FAVORITES_LIMIT + 5 }, (_, i) => i + 1),
    );
    expect(parseFavorites(many)).toHaveLength(FAVORITES_LIMIT);
  });
});

describe('toggled', () => {
  it('puts a new product first and takes a chosen one out', () => {
    expect(toggled([3, 1], 7)).toEqual([7, 3, 1]);
    expect(toggled([7, 3, 1], 3)).toEqual([7, 1]);
  });

  it('drops the oldest past the limit', () => {
    const full = Array.from({ length: FAVORITES_LIMIT }, (_, i) => i + 1);
    const next = toggled(full, 999);
    expect(next).toHaveLength(FAVORITES_LIMIT);
    expect(next[0]).toBe(999);
    expect(next).not.toContain(FAVORITES_LIMIT);
  });
});

describe('cardsRequest', () => {
  it('takes up to the limit of whole positive ids and a locale', () => {
    expect(cardsRequest.safeParse({ ids: [1, 2], locale: 'en' }).success).toBe(
      true,
    );
    expect(cardsRequest.safeParse({ ids: [], locale: 'uk' }).success).toBe(
      true,
    );
    for (const ids of [
      [0],
      [-1],
      [1.5],
      ['1'],
      Array.from({ length: FAVORITES_LIMIT + 1 }, (_, i) => i + 1),
    ])
      expect(cardsRequest.safeParse({ ids, locale: 'uk' }).success).toBe(false);
    expect(cardsRequest.safeParse({ ids: [1], locale: 'de' }).success).toBe(
      false,
    );
  });
});

describe('productCards', () => {
  const found = (id: number) => ({ id, card: { id } as CardProduct });

  it('answers in the order the browser kept, without what the store no longer has', async () => {
    vi.mocked(getListingProducts).mockResolvedValueOnce([
      found(1),
      found(3),
    ] as never);
    expect(await productCards([3, 2, 1], 'uk')).toEqual([found(3), found(1)]);
  });

  // An empty answer takes the asked ids out of the favorites: a request it cannot read fails
  // instead, and the page offers to try again.
  it('fails on a request it cannot read rather than answer with none', async () => {
    vi.mocked(getListingProducts).mockClear();
    await expect(productCards([1.5], 'uk')).rejects.toThrow();
    await expect(productCards([1], 'de')).rejects.toThrow();
    expect(await productCards([], 'uk')).toEqual([]);
    expect(getListingProducts).not.toHaveBeenCalled();
  });
});
