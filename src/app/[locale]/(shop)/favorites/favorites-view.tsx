import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ProductCard from '@/components/shared/product/product-card';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { CardProduct } from '@/types';

export type FavoritesStatus = 'loading' | 'done' | 'failed';

type Props = {
  status: FavoritesStatus;
  products: { id: number; card: CardProduct }[];
  onRetry?: () => void;
};

// What the favorites page shows: the cards, the newest favorite first; the way to the brands
// while there are none; a second try when the cards did not come.
const FavoritesView = ({ status, products, onRetry }: Props) => {
  const t = useTranslations('Favorites');
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
  if (products.length === 0)
    return (
      <div className="mt-8 flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
        <Heart className="size-5 text-muted-foreground" aria-hidden />
        <p className="max-w-prose">{t('empty')}</p>
        <Button asChild variant="outline" size="sm" className="mt-1">
          <Link href="/brands">{t('brands')}</Link>
        </Button>
      </div>
    );
  return (
    <>
      <p role="status" className="mt-6 text-sm text-muted-foreground">
        {t('count', { count: products.length })}
      </p>
      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product, index) => (
          <li key={product.id}>
            <ProductCard product={product.card} eager={index < 4} />
          </li>
        ))}
      </ul>
    </>
  );
};

export default FavoritesView;
