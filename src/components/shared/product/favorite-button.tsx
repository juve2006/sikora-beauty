'use client';

import { Heart } from 'lucide-react';
import { cn } from 'cn';
import { useTranslations } from 'next-intl';
import { toggleFavorite, useFavorites } from '@/lib/favorites';
import { Button } from '@/components/ui/button';

type Props = {
  id: number;
  // The heart alone, over a card's photo, is named after its product: a list has many of them.
  name: string;
  // A product's page names it in words, beside the product's own heading.
  labelled?: boolean;
  // /canvas only: the state to show.
  pressed?: boolean;
  className?: string;
};

// Marks a product as a favorite or takes it out. As a toggle button its name stays the same and
// `aria-pressed` tells whether the product is a favorite; the heart fills.
const FavoriteButton = ({
  id,
  name,
  labelled = false,
  pressed,
  className,
}: Props) => {
  const t = useTranslations('Favorites');
  const favorites = useFavorites();
  const on = pressed ?? favorites.includes(id);
  return (
    <Button
      variant="outline"
      size={labelled ? 'sm' : 'icon'}
      aria-pressed={on}
      aria-label={labelled ? undefined : t('toggleProduct', { name })}
      onClick={() => toggleFavorite(id)}
      className={cn(
        // Over a photo the heart keeps the page's background in both themes.
        !labelled && 'rounded-full bg-background/90 dark:bg-background/90',
        on && 'text-primary hover:text-primary',
        className,
      )}
    >
      <Heart
        data-icon={labelled ? 'inline-start' : undefined}
        className={cn(on && 'fill-current')}
        aria-hidden
      />
      {labelled && t('toggle')}
    </Button>
  );
};

export default FavoriteButton;
