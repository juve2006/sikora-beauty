import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { brandName, jsonLdScript, photos, populated, productJsonLd } from '@/catalog/productPage'
import { getProduct, getRelated } from '@/catalog/storefront'
import { AddToCart } from '@/components/product/AddToCart'
import { Availability } from '@/components/product/Availability'
import { DeliveryPayment } from '@/components/product/DeliveryPayment'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductPrice } from '@/components/product/ProductPrice'
import { SiteHeader } from '@/components/SiteHeader'
import { Badge } from '@/components/ui/badge'
import { getPathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { siteUrl } from '@/lib/site'
import type { SkinCondition, SkinConcern, SkinType } from '@/payload-types'

type Props = { params: Promise<{ locale: string; slug: string }> }

// Nothing is rendered at build time — CI builds without a database (RULES.md). A page is rendered
// on its first visit and kept until publishing in the admin revalidates the storefront.
export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const product = await getProduct(slug, locale)
  if (!product) return {}

  const href = `/product/${slug}`
  const [photo] = photos(product.images)
  return {
    title: product.name,
    description: product.shortDescription ?? undefined,
    alternates: {
      canonical: getPathname({ href, locale }),
      languages: {
        uk: getPathname({ href, locale: 'uk' }),
        en: getPathname({ href, locale: 'en' }),
        'x-default': getPathname({ href, locale: routing.defaultLocale }),
      },
    },
    openGraph: { title: product.name, description: product.shortDescription ?? undefined, images: photo && [photo] },
  }
}

function TextSection({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className={className ?? 'mt-3 leading-relaxed whitespace-pre-line'}>{children}</p>
    </section>
  )
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  const product = await getProduct(slug, locale)
  if (!product) notFound()

  const t = await getTranslations('Product')
  const related = await getRelated(product, locale)
  const brand = brandName(product.brand)
  const skin = (
    [
      ['skinTypes', populated<SkinType>(product.skinTypes)],
      ['skinConditions', populated<SkinCondition>(product.skinConditions)],
      ['skinConcerns', populated<SkinConcern>(product.skinConcerns)],
    ] as const
  ).filter(([, terms]) => terms.length > 0)
  // An API write that replaced the rows from one locale leaves the other's names empty.
  const actives = (product.actives ?? []).filter((active) => active.name)
  const url = new URL(getPathname({ href: `/product/${slug}`, locale }), siteUrl)

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
        <div className="grid gap-8 pt-2 lg:grid-cols-2 lg:gap-12 lg:pt-8">
          <ProductGallery photos={photos(product.images)} />

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              {brand && <p className="text-sm text-muted-foreground">{brand}</p>}
              <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
                {product.name}
              </h1>
              {product.volume != null && product.volumeUnit && (
                <p className="text-muted-foreground">
                  {t('volume', { volume: product.volume, unit: product.volumeUnit })}
                </p>
              )}
            </div>
            <div className="flex flex-col items-start gap-3">
              <ProductPrice price={product.price} className="text-3xl font-semibold tracking-tight" />
              <Availability availability={product.availability} madeToOrderDays={product.madeToOrderDays} />
            </div>
            <AddToCart />
            {product.shortDescription && (
              <p className="leading-relaxed whitespace-pre-line">{product.shortDescription}</p>
            )}
            {skin.length > 0 && (
              <section>
                <h2 className="font-medium">{t('skin')}</h2>
                <dl className="mt-3 flex flex-col gap-3">
                  {skin.map(([key, terms]) => (
                    <div key={key}>
                      <dt className="text-sm text-muted-foreground">{t(key)}</dt>
                      <dd className="mt-1.5 flex flex-wrap gap-1.5">
                        {terms.map((term) => (
                          <Badge key={term.id}>{term.title}</Badge>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            <DeliveryPayment />
          </div>
        </div>

        <div className="mt-12 flex max-w-3xl flex-col gap-10">
          {product.purpose && <TextSection title={t('purpose')}>{product.purpose}</TextSection>}
          {actives.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">{t('actives')}</h2>
              <dl className="mt-3 flex flex-col gap-4">
                {actives.map((active) => (
                  <div key={active.id ?? active.name}>
                    <dt className="font-medium">{active.name}</dt>
                    {active.role && <dd className="mt-1 leading-relaxed text-muted-foreground">{active.role}</dd>}
                  </div>
                ))}
              </dl>
            </section>
          )}
          {product.howToUse && <TextSection title={t('howToUse')}>{product.howToUse}</TextSection>}
          {product.warnings && <TextSection title={t('warnings')}>{product.warnings}</TextSection>}
          {product.inci && (
            <TextSection title={t('inci')} className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {product.inci}
            </TextSection>
          )}
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-semibold tracking-tight">{t('related')}</h2>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((item) => (
                <li key={item.id}>
                  <ProductCard
                    product={{
                      ...item,
                      slug: item.slug ?? String(item.id),
                      brand: brandName(item.brand) ?? '',
                      photo: photos(item.images)[0],
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product, url)) }} />
    </div>
  )
}
