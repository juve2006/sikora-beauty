'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState, useSyncExternalStore } from 'react';
import CartView, { type CartStatus } from './cart-view';
import CheckoutForm from './checkout-form';
import { productCards } from '@/lib/actions/product-cards.actions';
import { keepCart, removeFromCart, setQuantity, useCart } from '@/lib/cart';
import type { CardProduct } from '@/types';

const nothing = () => () => {};

// The cart with its products as the server has them today, and the checkout under it. Like the
// favorites, it asks once for every line it has no card for and takes out of the cart what the
// server no longer has. «Loading» and «failed» take the page only while no line is shown: after
// the first answer, a line another tab adds and the cart the order found changed are asked for
// behind the shown lines, so the form keeps what was typed, and a line that does not come is told
// above them with a retry.
const CartList = () => {
  const locale = useLocale();
  const lines = useCart();
  const ids = lines.map(({ id }) => id);
  // Until hydration the cart is unknown, not empty.
  const hydrated = useSyncExternalStore(
    nothing,
    () => true,
    () => false,
  );
  // None until the server first answers.
  const [loaded, setLoaded] = useState<{
    asked: number[];
    products: { id: number; card: CardProduct }[];
  } | null>(null);
  const [stale, setStale] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [removed, setRemoved] = useState(0);
  const missing = ids.some((id) => !loaded?.asked.includes(id));
  const key = ids.join();

  useEffect(() => {
    if (!missing && !stale) return;
    let current = true;
    const asked = key ? key.split(',').map(Number) : [];
    productCards(asked, locale).then(
      (products) => {
        if (!current) return;
        setLoaded({ asked, products });
        setStale(false);
        setFailed(false);
        const gone = keepCart(
          asked,
          products.map(({ id }) => id),
        );
        if (gone > 0) setRemoved((count) => count + gone);
      },
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, [missing, stale, key, locale, attempt]);

  const items = lines.flatMap((line) => {
    const found = loaded?.products.find(({ id }) => id === line.id);
    return found ? [{ line, card: found.card }] : [];
  });
  const status: CartStatus =
    !hydrated || (missing && !loaded && !failed)
      ? 'loading'
      : missing && failed && items.length === 0
        ? 'failed'
        : 'done';
  return (
    <CartView
      status={status}
      items={items}
      removed={removed}
      notLoaded={failed ? lines.length - items.length : 0}
      onRetry={() => {
        setFailed(false);
        setAttempt(attempt + 1);
      }}
      onQuantity={setQuantity}
      onRemove={removeFromCart}
      checkout={(order) => (
        <CheckoutForm
          {...order}
          onChanged={() => {
            setStale(true);
            setAttempt((count) => count + 1);
          }}
        />
      )}
    />
  );
};

export default CartList;
