import { ImageOff, Minus, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Availability from '@/components/shared/product/availability';
import ProductPrice from '@/components/shared/product/product-price';
import { Link } from '@/i18n/navigation';
import { CART_QUANTITY_MAX } from '@/lib/constants';
import { formatHryvnias } from '@/lib/utils';
import type { CardProduct } from '@/types';
import { Button } from '@/components/ui/button';

type Props = {
  product: CardProduct;
  qty: number;
  onQuantity?: (qty: number) => void;
  onRemove?: () => void;
};

// One line of the cart: the product as the server has it today, how many, and what they cost. A
// line out of stock stays, marked, with no quantity to change: it is not ordered.
// The photo, the name and «remove» share the first row; the quantity and the sum take a row of
// their own — beside the name, at 360 px, they would not fit.
const CartLine = ({ product, qty, onQuantity, onRemove }: Props) => {
  const t = useTranslations('Cart');
  const p = useTranslations('Product');
  const out = product.availability === 'out_of_stock';
  const href = `/product/${product.slug}`;
  return (
    <li className="grid grid-cols-[4rem_minmax(0,1fr)_auto] gap-x-3 gap-y-3 py-4">
      {/* The name beside it is the link a reader and the keyboard take; the photo repeats it for a
          thumb. */}
      <Link href={href} tabIndex={-1} aria-hidden>
        {product.photo ? (
          <Image
            src={product.photo.url}
            alt=""
            width={64}
            height={64}
            className="size-16 rounded-md border bg-card object-contain"
          />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <ImageOff className="size-5" aria-hidden />
          </span>
        )}
      </Link>
      <div className="flex flex-col items-start gap-1">
        <span className="text-xs text-muted-foreground">{product.brand}</span>
        <Link
          href={href}
          className="rounded-sm leading-snug font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {product.name}
        </Link>
        {product.volume != null && product.volumeUnit && (
          <span className="text-sm text-muted-foreground">
            {p('volume', { volume: product.volume, unit: product.volumeUnit })}
          </span>
        )}
        <span className="text-sm text-muted-foreground tabular-nums">
          {t('each', {
            price: p('price', { amount: formatHryvnias(product.price) }),
          })}
        </span>
        {product.availability !== 'in_stock' && (
          <Availability
            availability={product.availability}
            madeToOrderDays={product.madeToOrderDays}
          />
        )}
        {out && (
          <p className="text-sm text-muted-foreground">{t('notOrdered')}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('remove', { name: product.name })}
        onClick={onRemove}
        className="-mt-2 -mr-2 text-muted-foreground"
      >
        <Trash2 aria-hidden />
      </Button>
      {!out && (
        <div className="col-span-full flex items-center justify-between gap-4 sm:col-start-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label={t('less', { name: product.name })}
              disabled={qty <= 1}
              onClick={() => onQuantity?.(qty - 1)}
            >
              <Minus aria-hidden />
            </Button>
            <span
              aria-live="polite"
              className="w-8 text-center font-medium tabular-nums"
            >
              <span className="sr-only">{t('quantity', { qty })}</span>
              <span aria-hidden>{qty}</span>
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label={t('more', { name: product.name })}
              disabled={qty >= CART_QUANTITY_MAX}
              onClick={() => onQuantity?.(qty + 1)}
            >
              <Plus aria-hidden />
            </Button>
          </div>
          <ProductPrice
            price={product.price * qty}
            className="font-semibold tabular-nums"
          />
        </div>
      )}
    </li>
  );
};

export default CartLine;
