'use client';

import { ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCart } from '@/lib/cart';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

// The header's way to the cart, with how many items are in it — every line's quantity — on the
// bag. The count comes on hydration: the server does not know a browser's cart.
// `shown` is for /canvas only: the count to show.
const CartLink = ({ shown }: { shown?: number }) => {
  const t = useTranslations('Cart');
  const lines = useCart();
  const count = shown ?? lines.reduce((sum, line) => sum + line.qty, 0);
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link
        href="/cart"
        aria-label={count > 0 ? t('linkCount', { count }) : undefined}
      >
        {/* The count stands out past the bag. */}
        <span className="relative">
          <ShoppingBag aria-hidden />
          {count > 0 && (
            <span
              aria-hidden
              className="absolute -top-2 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs leading-none text-primary-foreground tabular-nums"
            >
              {count}
            </span>
          )}
        </span>
        {/* The icon alone, as the client's mockup has the header; the word names it. */}
        <span className="sr-only">{t('title')}</span>
      </Link>
    </Button>
  );
};

export default CartLink;
