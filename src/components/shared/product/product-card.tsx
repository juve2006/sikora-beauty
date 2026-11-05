import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Availability from './availability';
import FavoriteButton from './favorite-button';
import NoPhoto from './no-photo';
import ProductPrice from './product-price';
import { Link } from '@/i18n/navigation';
import type { CardProduct } from '@/types';

// One product in a list: related products and the catalog's lists. `eager` for the first row, the
// page's largest paint, which a lazy image would delay. The heart sits over the photo beside the
// link, not in it: a button inside a link is neither.
const ProductCard = ({
  product,
  eager = false,
}: {
  product: CardProduct;
  eager?: boolean;
}) => {
  const t = useTranslations('Product');
  return (
    <div className="relative">
      <Link
        href={`/product/${product.slug}`}
        className="group flex flex-col gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {product.photo ? (
          <div className="relative aspect-square overflow-hidden rounded-lg border bg-card">
            <Image
              src={product.photo.url}
              alt={product.photo.alt}
              fill
              loading={eager ? 'eager' : 'lazy'}
              sizes="(min-width: 1024px) 340px, 50vw"
              className="object-contain"
            />
          </div>
        ) : (
          <NoPhoto />
        )}
        <div className="flex flex-col items-start gap-1">
          <span className="text-sm text-muted-foreground">{product.brand}</span>
          <span className="leading-snug font-medium group-hover:underline">
            {product.name}
          </span>
          {product.volume != null && product.volumeUnit && (
            <span className="text-sm text-muted-foreground">
              {t('volume', {
                volume: product.volume,
                unit: product.volumeUnit,
              })}
            </span>
          )}
          <ProductPrice price={product.price} className="mt-1 font-semibold" />
          <Availability
            availability={product.availability}
            madeToOrderDays={product.madeToOrderDays}
          />
        </div>
      </Link>
      <FavoriteButton
        id={product.id}
        name={product.name}
        className="absolute top-2 right-2"
      />
    </div>
  );
};

export default ProductCard;
