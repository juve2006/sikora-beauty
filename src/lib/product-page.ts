import type { Media, Product } from '@/payload-types'
import { offerPrice } from './price'

// What the product page derives from a product it read.

// A relationship read at depth 1: what the reader may see arrives as a document, the rest as an id.
export function populated<T extends object>(values: (number | T)[] | null | undefined): T[] {
  return (values ?? []).filter((value): value is T => typeof value === 'object')
}

// The product's photos in the admin's order; the first is the main one.
export function photos(images: Product['images']): { url: string; alt: string }[] {
  return populated<Media>(images).flatMap((image) => (image.url ? [{ url: image.url, alt: image.alt }] : []))
}

// Deleting a brand leaves its products with none: the database sets the reference to null, which
// the generated type does not admit.
export function brandName(brand: Product['brand'] | null): string | null {
  return brand && typeof brand === 'object' ? brand.name : null
}

const availability = { in_stock: 'InStock', made_to_order: 'MadeToOrder', out_of_stock: 'OutOfStock' } as const

// schema.org Product for search results: the price a shopper sees and whether they can get it.
// `url` is the page's absolute address; a photo stored locally has a path, resolved against it.
export function productJsonLd(product: Product, url: URL) {
  const brand = brandName(product.brand)
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? undefined,
    url: url.href,
    image: photos(product.images).map((photo) => new URL(photo.url, url).href),
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    offers: {
      '@type': 'Offer',
      price: offerPrice(product.price),
      priceCurrency: 'UAH',
      availability: `https://schema.org/${availability[product.availability]}`,
    },
  }
}

// A product text holding "</script>" would end the tag early: `<` is escaped.
export function jsonLdScript(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
