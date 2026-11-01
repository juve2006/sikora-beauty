'use client';

import { ShoppingBag } from 'lucide-react';
import { cn } from 'cn';
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
        {/* The count stands out past the bag; beside the word it needs the room. */}
        <span className={cn('relative', count > 0 && 'sm:me-2')}>
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
        {/* A phone's header keeps one line: the icon, named by the same word. */}
        <span className="max-sm:sr-only">{t('title')}</span>
      </Link>
    </Button>
  );
};

export default CartLink;
