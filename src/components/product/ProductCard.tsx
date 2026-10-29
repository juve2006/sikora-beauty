import { useTranslations } from 'next-intl'
import Image from 'next/image'

import { Availability } from '@/components/product/Availability'
import { NoPhoto, type Photo } from '@/components/product/ProductGallery'
import { ProductPrice } from '@/components/product/ProductPrice'
import { Link } from '@/i18n/navigation'
import type { Product } from '@/payload-types'

export type CardProduct = Pick<Product, 'name' | 'price' | 'volume' | 'volumeUnit' | 'availability' | 'madeToOrderDays'> & {
  slug: string
  brand: string
  photo?: Photo
}

// One product in a list: related products now, the catalog's lists later.
export function ProductCard({ product }: { product: CardProduct }) {
  const t = useTranslations('Product')
  return (
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
            sizes="(min-width: 1024px) 240px, 50vw"
            className="object-contain"
          />
        </div>
      ) : (
        <NoPhoto />
      )}
      <div className="flex flex-col items-start gap-1">
        <span className="text-sm text-muted-foreground">{product.brand}</span>
        <span className="leading-snug font-medium group-hover:underline">{product.name}</span>
        {product.volume != null && product.volumeUnit && (
          <span className="text-sm text-muted-foreground">
            {t('volume', { volume: product.volume, unit: product.volumeUnit })}
          </span>
        )}
        <ProductPrice price={product.price} className="mt-1 font-semibold" />
        <Availability availability={product.availability} madeToOrderDays={product.madeToOrderDays} />
      </div>
    </Link>
  )
}
