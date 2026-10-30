import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { listing, listingParams } from '@/catalog/listing'
import { getFacets, getListingProducts, getSkinTerm } from '@/catalog/storefront'
import { Listing } from '@/components/catalog/Listing'
import { SiteHeader } from '@/components/SiteHeader'
import { alternates } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

// A skin concern's or a skin type's landing page: every published product with that term, across
// the zones, and the other filters. Rendered on every request, as a catalog page.

export type LandingProps = {
  params: Promise<{ locale: string; slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const landings = {
  concern: { collection: 'skin-concerns', path: 'concern', field: 'skinConcerns' },
  type: { collection: 'skin-types', path: 'skin-type', field: 'skinTypes' },
} as const

export function landing(facet: keyof typeof landings) {
  const { collection, path, field } = landings[facet]

  async function generateMetadata({ params, searchParams }: LandingProps): Promise<Metadata> {
    const { locale, slug } = await params
    if (!hasLocale(routing.locales, locale)) return {}
    const term = await getSkinTerm(collection, slug, locale)
    if (!term) return {}
    const t = await getTranslations({ locale, namespace: 'Catalog' })
    const { page } = listingParams.parse(await searchParams)
    return {
      title: t('landingTitle', { kind: t(`facets.${facet}`), title: term.title }),
      alternates: alternates(`/${path}/${slug}${page > 1 ? `?page=${page}` : ''}`, locale),
    }
  }

  async function LandingPage({ params, searchParams }: LandingProps) {
    const { locale, slug } = await params
    if (!hasLocale(routing.locales, locale)) notFound()
    const term = await getSkinTerm(collection, slug, locale)
    if (!term) notFound()

    const t = await getTranslations('Catalog')
    const query = listingParams.parse(await searchParams)
    const [products, facets] = await Promise.all([
      getListingProducts({ [field]: { in: [term.id] } }, locale),
      getFacets(locale),
    ])
    // The page's own term is its subject, not a filter.
    const result = listing(products, facets.filter(({ key }) => key !== facet), query)
    if (query.page > result.pageCount) notFound()

    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <Listing title={term.title} above={t(`facets.${facet}`)} result={result} params={query} basePath={`/${path}/${slug}`} />
      </div>
    )
  }

  return { generateMetadata, LandingPage }
}
