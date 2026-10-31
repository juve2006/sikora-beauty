'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState, useSyncExternalStore } from 'react';
import FavoritesView, { type FavoritesStatus } from './favorites-view';
import { favoriteProducts } from '@/lib/actions/favorites.actions';
import { keepFavorites, useFavorites } from '@/lib/favorites';
import type { CardProduct } from '@/types';

const nothing = () => () => {};

// The favorites as cards. It asks the server once for every favorite it has no answer for — a
// heart taken off here only hides its card — and takes out of the favorites what the server no
// longer has.
const FavoritesList = () => {
  const locale = useLocale();
  const ids = useFavorites();
  // Until hydration the favorites are unknown, not empty.
  const hydrated = useSyncExternalStore(
    nothing,
    () => true,
    () => false,
  );
  const [loaded, setLoaded] = useState<{
    asked: number[];
    products: { id: number; card: CardProduct }[];
  }>({ asked: [], products: [] });
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const missing = ids.some((id) => !loaded.asked.includes(id));

  useEffect(() => {
    if (!missing) return;
    let current = true;
    favoriteProducts(ids, locale).then(
      (products) => {
        if (!current) return;
        setLoaded({ asked: ids, products });
        setFailed(false);
        keepFavorites(
          ids,
          products.map(({ id }) => id),
        );
      },
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, [missing, ids, locale, attempt]);

  const status: FavoritesStatus =
    !hydrated || (missing && !failed) ? 'loading' : missing ? 'failed' : 'done';
  return (
    <FavoritesView
      status={status}
      products={ids.flatMap(
        (id) => loaded.products.find((product) => product.id === id) ?? [],
      )}
      onRetry={() => {
        setFailed(false);
        setAttempt(attempt + 1);
      }}
    />
  );
};

export default FavoritesList;
