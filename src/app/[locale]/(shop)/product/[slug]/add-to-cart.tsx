'use client';

import { Check, ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { addToCart, useCart } from '@/lib/cart';
import { Link } from '@/i18n/navigation';
import type { Availability } from '@/types';
import { Button } from '@/components/ui/button';

type Props = {
  id: number;
  availability: Availability;
  // /canvas only: the product as already in the cart.
  inCart?: boolean;
};

// Puts one of the product in the cart; once it is there, the way to the cart. A product out of
// stock cannot be added: the page is cached until a save in the admin, and so is its availability.
const AddToCart = ({ id, availability, inCart = false }: Props) => {
  const t = useTranslations('Product');
  const lines = useCart();
  const hint = useId();
  const link = useRef<HTMLAnchorElement>(null);
  const [added, setAdded] = useState(false);
  const kept = inCart || lines.some((line) => line.id === id);

  // The button the shopper pressed is gone: the focus goes to the link that took its place.
  useEffect(() => {
    if (added) link.current?.focus();
  }, [added]);

  if (availability === 'out_of_stock')
    return (
      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          disabled
          aria-describedby={hint}
          className="w-full sm:w-fit"
        >
          <ShoppingBag data-icon="inline-start" aria-hidden />
          {t('addToCart')}
        </Button>
        <p id={hint} className="text-sm text-muted-foreground">
          {t('outOfStock')}
        </p>
      </div>
    );
  return (
    <div className="flex flex-col gap-2">
      {kept ? (
        <Button size="lg" variant="outline" asChild className="w-full sm:w-fit">
          <Link ref={link} href="/cart">
            <Check data-icon="inline-start" aria-hidden />
            {t('goToCart')}
          </Link>
        </Button>
      ) : (
        <Button
          size="lg"
          className="w-full sm:w-fit"
          onClick={() => {
            addToCart(id);
            setAdded(true);
          }}
        >
          <ShoppingBag data-icon="inline-start" aria-hidden />
          {t('addToCart')}
        </Button>
      )}
      {/* Present and empty from the start: a reader announces what appears in a live region, not
          a region that appears. */}
      <p role="status" className="text-sm text-muted-foreground">
        {added ? t('added') : ''}
      </p>
    </div>
  );
};

export default AddToCart;
