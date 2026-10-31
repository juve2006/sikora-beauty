import { ImageOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import ProductPrice from '@/components/shared/product/product-price';
import { Link } from '@/i18n/navigation';
import type { CardProduct } from '@/types';

export type SuggestionsStatus = 'idle' | 'loading' | 'done' | 'failed';

type Props = {
  status: SuggestionsStatus;
  query: string;
  products: CardProduct[];
  onPick?: () => void;
};

// What the search dialog shows under its field: a hint, the closest products and a link to all of
// them, or why there are none. While a new query runs, the last products stay, dimmed.
const SearchSuggestions = ({ status, query, products, onPick }: Props) => {
  const t = useTranslations('Search');
  const message = {
    idle: t('hint'),
    loading: t('searching'),
    failed: t('failed'),
    done: products.length === 0 ? t('none') : '',
  }[status];
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p aria-live="polite" className="text-muted-foreground empty:hidden">
        {message}
      </p>
      {status !== 'idle' && status !== 'failed' && products.length > 0 && (
        <>
          <ul
            className={
              status === 'loading' ? 'opacity-60 transition-opacity' : ''
            }
          >
            {products.map((product) => (
              <li key={product.slug}>
                <Link
                  href={`/product/${product.slug}`}
                  onClick={onPick}
                  className="flex items-center gap-3 rounded-lg p-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {product.photo ? (
                    <Image
                      src={product.photo.url}
                      alt=""
                      width={48}
                      height={48}
                      className="size-12 shrink-0 rounded-md border bg-card object-contain"
                    />
                  ) : (
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                      <ImageOff className="size-4" aria-hidden />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="text-xs text-muted-foreground">
                      {product.brand}
                    </span>
                    <span className="line-clamp-2 leading-snug font-medium">
                      {product.name}
                    </span>
                  </span>
                  <ProductPrice
                    price={product.price}
                    className="ml-auto shrink-0 pl-2 font-medium"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={{ pathname: '/search', query: { q: query } }}
            onClick={onPick}
            className="self-start rounded-sm p-2 font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t('all')}
          </Link>
        </>
      )}
    </div>
  );
};

export default SearchSuggestions;
