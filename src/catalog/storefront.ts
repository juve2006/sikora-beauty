import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { Config, Product } from '@/payload-types'

// The storefront's reads of the catalog: published products only — the Local API skips access
// control unless told not to (RULES.md) — in the page's language, with the Ukrainian fallback.

type Locale = Config['locale']

// Cached per request: the page and its metadata read the same product.
export const getProduct = cache(async (slug: string, locale: Locale) => {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    locale,
    depth: 1,
    limit: 1,
    overrideAccess: false,
    // Related products are read by getRelated, with what a card shows.
    populate: { products: { slug: true } },
  })
  return docs[0] ?? null
})

// A related product still in draft is left out; the rest keep the cosmetologist's order.
export async function getRelated(product: Product, locale: Locale) {
  const ids = (product.related ?? []).map((related) => (typeof related === 'object' ? related.id : related))
  if (ids.length === 0) return []
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'products',
    where: { id: { in: ids } },
    locale,
    depth: 1,
    limit: ids.length,
    overrideAccess: false,
    select: {
      name: true,
      slug: true,
      brand: true,
      price: true,
      volume: true,
      volumeUnit: true,
      availability: true,
      madeToOrderDays: true,
      images: true,
    },
  })
  return docs.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
}
