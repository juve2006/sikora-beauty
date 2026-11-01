'use client';

import { ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import CartLine from './cart-line';
import ProductPrice from '@/components/shared/product/product-price';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { CardProduct, CartLine as Line } from '@/types';

export type CartStatus = 'loading' | 'done' | 'failed';

type Props = {
  status: CartStatus;
  items: { line: Line; card: CardProduct }[];
  // How many lines left because the store no longer has their products.
  removed?: number;
  onRetry?: () => void;
  onQuantity?: (id: number, qty: number) => void;
  onRemove?: (id: number) => void;
  // The checkout, given what can be ordered and the sum the shopper is shown.
  checkout?: (order: { lines: Line[]; total: number }) => ReactNode;
};

// What the cart page shows: the lines, the newest first, and their sum; the checkout under them
// once something can be ordered. The sum is shown in integer kopiyky's hryvnias; the server prices
// the order again (RULES.md).
const CartView = ({
  status,
  items,
  removed = 0,
  onRetry,
  onQuantity,
  onRemove,
  checkout,
}: Props) => {
  const t = useTranslations('Cart');
  if (status === 'loading')
    return (
      <p role="status" className="mt-6 text-muted-foreground">
        {t('loading')}
      </p>
    );
  if (status === 'failed')
    return (
      <div role="alert" className="mt-6 flex flex-col items-start gap-3">
        <p>{t('failed')}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('retry')}
        </Button>
      </div>
    );

  const orderable = items.filter(
    ({ card }) => card.availability !== 'out_of_stock',
  );
  const total = orderable.reduce(
    (sum, { line, card }) => sum + card.price * line.qty,
    0,
  );
  const count = orderable.reduce((sum, { line }) => sum + line.qty, 0);
  return (
    <>
      {removed > 0 && (
        <p role="status" className="mt-6 text-sm text-muted-foreground">
          {t('removed', { count: removed })}
        </p>
      )}
      {items.length === 0 ? (
        <div className="mt-8 flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
          <ShoppingBag className="size-5 text-muted-foreground" aria-hidden />
          <p className="max-w-prose">{t('empty')}</p>
          <Button asChild variant="outline" size="sm" className="mt-1">
            <Link href="/brands">{t('brands')}</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="mt-4 divide-y border-y">
            {items.map(({ line, card }) => (
              <CartLine
                key={line.id}
                product={card}
                qty={line.qty}
                onQuantity={(qty) => onQuantity?.(line.id, qty)}
                onRemove={() => onRemove?.(line.id)}
              />
            ))}
          </ul>
          {orderable.length > 0 ? (
            <div className="mt-4 flex items-baseline justify-between gap-4">
              <span>
                {t('total')}{' '}
                <span className="text-muted-foreground">
                  ({t('count', { count })})
                </span>
              </span>
              <ProductPrice
                price={total}
                className="text-xl font-semibold tabular-nums"
              />
            </div>
          ) : (
            <p className="mt-4 max-w-prose">{t('nothingToOrder')}</p>
          )}
          {orderable.length > 0 &&
            checkout?.({ lines: orderable.map(({ line }) => line), total })}
        </>
      )}
    </>
  );
};

export default CartView;
