'use client';

import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFavorites } from '@/lib/favorites';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

// The header's way to the favorites, with how many there are on the heart. The count comes on
// hydration: the server does not know a browser's favorites.
// `shown` is for /canvas only: the count to show.
const FavoritesLink = ({ shown }: { shown?: number }) => {
  const t = useTranslations('Favorites');
  const favorites = useFavorites();
  const count = shown ?? favorites.length;
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link
        href="/favorites"
        aria-label={count > 0 ? t('linkCount', { count }) : undefined}
      >
        {/* The count stands out past the heart. */}
        <span className="relative">
          <Heart aria-hidden />
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

export default FavoritesLink;
