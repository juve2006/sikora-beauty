import { useTranslations } from 'next-intl';
import Image from 'next/image';
import AddToCart from './add-to-cart';
import Availability from './availability';
import FavoriteButton from './favorite-button';
import NoPhoto from './no-photo';
import ProductPrice from './product-price';
import { Link } from '@/i18n/navigation';
import type { CardProduct } from '@/types';

// One product in a list: related products and the catalog's lists. `eager` for the first row, the
// page's largest paint, which a lazy image would delay. The heart and the cart's button sit beside
// the link, not in it: a button inside a link is neither. The card fills its grid cell and its price
// stands at the foot of the text, so the prices and the buttons of a row each keep one line, however
// many lines a name or a description takes. The photo's frame is the mockup's card, which the marked
// photo already has (src/lib/watermark.ts).
const ProductCard = ({
  product,
  eager = false,
}: {
  product: CardProduct;
  eager?: boolean;
}) => {
  const t = useTranslations('Product');
  return (
    <div className="relative flex h-full flex-col gap-4">
      <Link
        href={`/product/${product.slug}`}
        className="group flex flex-1 flex-col gap-4 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {product.photo ? (
          <div className="relative aspect-photo overflow-hidden rounded-xl bg-card">
            <Image
              src={product.photo.url}
              alt={product.photo.alt}
              fill
              loading={eager ? 'eager' : 'lazy'}
              sizes="(min-width: 1024px) 340px, 50vw"
              className="object-cover"
            />
          </div>
        ) : (
          <NoPhoto />
        )}
        <div className="flex flex-1 flex-col items-start gap-1 px-0.5">
          <span className="text-xs tracking-widest text-muted-foreground uppercase">
            {product.brand}
          </span>
          <span className="leading-snug font-medium group-hover:underline">
            {product.name}
          </span>
          {/* The description is clamped, the volume never: it is what tells two sizes apart. */}
          {product.shortDescription && (
            <span className="line-clamp-2 text-sm text-muted-foreground">
              {product.shortDescription}
            </span>
          )}
          {product.volume != null && product.volumeUnit && (
            <span className="text-sm text-muted-foreground">
              {t('volume', {
                volume: product.volume,
                unit: product.volumeUnit,
              })}
            </span>
          )}
          {/* The availability over the price, so the price is the text's last line in every card. */}
          <div className="mt-auto flex flex-col items-start gap-1 pt-3">
            {/* In stock is the usual case: the card says only when it is not. */}
            {product.availability !== 'in_stock' && (
              <Availability
                availability={product.availability}
                madeToOrderDays={product.madeToOrderDays}
              />
            )}
            <ProductPrice
              price={product.price}
              className="text-xl font-medium"
            />
          </div>
        </div>
      </Link>
      {/* Before the cart's button in the DOM, so the keyboard reaches the heart over the photo
          right after the link, not by going back up. */}
      <FavoriteButton
        id={product.id}
        name={product.name}
        className="absolute top-2 right-2"
      />
      <AddToCart
        id={product.id}
        availability={product.availability}
        name={product.name}
      />
    </div>
  );
};

export default ProductCard;
