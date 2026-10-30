import { revalidatePath } from 'next/cache'
import { commitTransaction, type Endpoint, initTransaction, killTransaction, type PayloadRequest } from 'payload'
import { z } from 'zod'

import { isOwner } from '@/lib/access'
import { brandOf, brandSlugs, cosmetikaProduct, type Imported, storeApi, toProduct } from '@/lib/cosmetika'
import { planPrices, type PricedProduct, toCsv } from '@/lib/prices'
import { volumeUnitLabels } from '@/lib/validators'

// The owner's «Імпорт» page (ImportView.tsx). Owner only: both tools write prices, which are the
// owner's (adr-20261029-admin-roles). Every write goes through access as the owner.

const forbidden = () => Response.json({ error: 'Лише для власника' }, { status: 403 })
const failure = (error: unknown) => (error instanceof Error ? error.message : String(error))
const unreachable = (error: unknown) => Response.json({ error: `cosmetika.com.ua: ${failure(error)}` }, { status: 502 })

// A request to cosmetika that hangs must not use up the function's time.
const get = (url: string) => fetch(url, { signal: AbortSignal.timeout(20_000) })

// Its answer is outside input too: the page count bounds the loop that reads every page.
const storePage = z.object({ items: z.array(z.unknown()), pages: z.coerce.number().int().min(1).max(10) })

async function readStore(query: string): Promise<z.infer<typeof storePage>> {
  const response = await get(`${storeApi}?${query}`)
  if (!response.ok) throw new Error(`відповіла ${response.status}`)
  const page = storePage.safeParse({ items: await response.json(), pages: response.headers.get('x-wp-totalpages') ?? 1 })
  if (!page.success) throw new Error('незрозуміла відповідь')
  return page.data
}

async function idsBySlug(req: PayloadRequest, collection: 'brands' | 'categories', slugs: string[]) {
  const { docs } = await req.payload.find({
    collection,
    where: { slug: { in: slugs } },
    pagination: false,
    depth: 0,
    req,
    overrideAccess: false,
  })
  return new Map(docs.map((doc) => [doc.slug, doc.id]))
}

type Result = { id: number; name?: string; status: 'created' | 'skipped' | 'failed'; message?: string }

// A product is created whole or not at all: photos uploaded for one that then fails are deleted,
// so the next run tries it again from the start.
type Ids = Awaited<ReturnType<typeof idsBySlug>>

async function importOne(req: PayloadRequest, product: Imported, brands: Ids, categories: Ids) {
  const { totalDocs } = await req.payload.count({
    collection: 'products',
    where: { slug: { equals: product.slug } },
    req,
    overrideAccess: false,
  })
  if (totalDocs) return { status: 'skipped' as const }
  const images: number[] = []
  try {
    for (const [index, src] of product.images.entries()) {
      const response = await get(src)
      const mimetype = response.headers.get('content-type')?.split(';')[0] ?? ''
      if (!response.ok || !mimetype.startsWith('image/')) {
        throw new Error(`фото ${index + 1} не завантажилось (${response.status})`)
      }
      const data = Buffer.from(await response.arrayBuffer())
      // Every environment shares one Blob store, and a server upload overwrites a file of the same
      // name: a run on another database must never replace Production's photo.
      const name = `${product.slug}-${index + 1}-${crypto.randomUUID().slice(0, 8)}.${mimetype.slice('image/'.length)}`
      const doc = await req.payload.create({
        collection: 'media',
        data: { alt: product.name },
        file: { data, mimetype, name, size: data.length },
        locale: 'uk',
        req,
        overrideAccess: false,
      })
      images.push(doc.id)
    }
    await req.payload.create({
      collection: 'products',
      draft: true,
      locale: 'uk',
      req,
      overrideAccess: false,
      // A draft: availability stays empty for the owner, and Payload checks the rest on publishing.
      data: {
        _status: 'draft',
        name: product.name,
        slug: product.slug,
        brand: brands.get(product.brand)!,
        categories: product.categories.flatMap((slug) => categories.get(slug) ?? []),
        isSet: product.isSet,
        price: product.price,
        volume: product.volume,
        volumeUnit: product.volumeUnit,
        images,
        purpose: product.purpose,
        howToUse: product.howToUse,
        inci: product.inci,
        inciSource: product.inciSource,
      },
    })
    return { status: 'created' as const }
  } catch (error) {
    if (images.length) {
      await req.payload.delete({ collection: 'media', where: { id: { in: images } }, req, overrideAccess: false })
    }
    return { status: 'failed' as const, message: failure(error) }
  }
}

async function pricedProducts(req: PayloadRequest): Promise<PricedProduct[]> {
  // The latest version of each, drafts included: a draft's price is what its publishing will show.
  const { docs } = await req.payload.find({
    collection: 'products',
    draft: true,
    pagination: false,
    depth: 1,
    locale: 'uk',
    sort: 'name',
    select: { slug: true, name: true, brand: true, volume: true, volumeUnit: true, price: true, _status: true },
    req,
    overrideAccess: false,
  })
  return docs.map((doc) => ({
    id: doc.id,
    slug: doc.slug ?? '',
    name: doc.name ?? '',
    brand: typeof doc.brand === 'object' ? (doc.brand?.name ?? '') : '',
    volume: doc.volume ? `${doc.volume} ${doc.volumeUnit ? volumeUnitLabels[doc.volumeUnit] : ''}`.trim() : '',
    price: doc.price ?? null,
    draft: doc._status !== 'published',
  }))
}

export const importEndpoints: Endpoint[] = [
  {
    // What cosmetika has of our brands: new or already here, and what the cosmetologist must fill.
    path: '/cosmetika',
    method: 'get',
    handler: async (req) => {
      if (!isOwner({ req })) return forbidden()
      const brands = await idsBySlug(req, 'brands', brandSlugs)
      const missing = brandSlugs.filter((slug) => !brands.has(slug))
      if (missing.length) return Response.json({ error: `Спершу заведіть бренди: ${missing.join(', ')}` }, { status: 409 })
      const items: unknown[] = []
      try {
        const first = await readStore('per_page=100&page=1')
        items.push(...first.items)
        for (let page = 2; page <= first.pages; page++) items.push(...(await readStore(`per_page=100&page=${page}`)).items)
      } catch (error) {
        return unreachable(error)
      }
      const products: { id: number; name: string; slug: string; warnings: string[] }[] = []
      const errors: { id: unknown; message: string }[] = []
      for (const item of items.filter(brandOf)) {
        const parsed = cosmetikaProduct.safeParse(item)
        if (!parsed.success) {
          errors.push({ id: (item as { id?: unknown }).id, message: `Не прочитано: ${parsed.error.issues[0].message}` })
          continue
        }
        const { name, slug, warnings } = toProduct(parsed.data)
        products.push({ id: parsed.data.id, name, slug, warnings })
      }
      const { docs } = await req.payload.find({
        collection: 'products',
        where: { slug: { in: products.map((product) => product.slug) } },
        pagination: false,
        depth: 0,
        select: { slug: true },
        req,
        overrideAccess: false,
      })
      const here = new Set(docs.map((doc) => doc.slug))
      return Response.json({ products: products.map((product) => ({ ...product, exists: here.has(product.slug) })), errors })
    },
  },
  {
    // A portion of the import: the page sends the ids a few at a time, each request well inside a
    // function's time. The products themselves are read from cosmetika here, never from the browser.
    path: '/cosmetika',
    method: 'post',
    handler: async (req) => {
      if (!isOwner({ req })) return forbidden()
      const body = z.object({ ids: z.array(z.number().int().positive()).min(1).max(5) }).safeParse(await req.json?.().catch(() => null))
      if (!body.success) return Response.json({ error: 'Очікую від 1 до 5 товарів cosmetika' }, { status: 400 })
      const { ids } = body.data
      let items: unknown[]
      try {
        items = (await readStore(`include=${ids.join(',')}&per_page=${ids.length}`)).items
      } catch (error) {
        return unreachable(error)
      }
      const products = items.filter(brandOf).flatMap((item) => {
        const parsed = cosmetikaProduct.safeParse(item)
        return parsed.success ? [{ id: parsed.data.id, ...toProduct(parsed.data) }] : []
      })
      const brands = await idsBySlug(req, 'brands', brandSlugs)
      const categories = await idsBySlug(req, 'categories', [...new Set(products.flatMap((product) => product.categories))])
      const results: Result[] = []
      for (const id of ids) {
        const product = products.find((candidate) => candidate.id === id)
        if (!product) results.push({ id, status: 'failed', message: 'Немає серед товарів наших брендів на cosmetika' })
        else results.push({ id, name: product.name, ...(await importOne(req, product, brands, categories)) })
      }
      return Response.json({ results })
    },
  },
  {
    path: '/prices',
    method: 'get',
    handler: async (req) => {
      if (!isOwner({ req })) return forbidden()
      const date = new Date().toISOString().slice(0, 10)
      return new Response(toCsv(await pricedProducts(req)), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="sikora-beauty-prices-${date}.csv"`,
        },
      })
    },
  },
  {
    // The plan of a price file; with `?apply=1` the same plan applied, in one transaction, and only
    // when it has no errors.
    path: '/prices',
    method: 'post',
    handler: async (req) => {
      if (!isOwner({ req })) return forbidden()
      const plan = planPrices((await req.text?.()) ?? '', await pricedProducts(req))
      if (req.searchParams.get('apply') !== '1' || plan.errors.length) return Response.json(plan)
      const ownTransaction = await initTransaction(req)
      try {
        for (const change of plan.changes) {
          // A published product is published with its new price; a draft keeps it in the draft.
          // The storefront is refreshed once, after the commit: a page rendered between a save and
          // the commit would cache the old prices.
          await req.payload.update({
            collection: 'products',
            id: change.id,
            data: { price: change.to },
            draft: change.draft,
            locale: 'uk',
            context: { disableRevalidate: true },
            req,
            overrideAccess: false,
          })
        }
        if (ownTransaction) await commitTransaction(req)
      } catch (error) {
        if (ownTransaction) await killTransaction(req)
        return Response.json({ ...plan, error: `Жодну ціну не змінено: ${failure(error)}` }, { status: 500 })
      }
      if (plan.changes.some((change) => !change.draft)) revalidatePath('/', 'layout')
      return Response.json({ ...plan, applied: plan.changes.length })
    },
  },
]
