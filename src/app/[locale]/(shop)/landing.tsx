import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { listing } from '@/lib/listing';
import { listingParams } from '@/lib/validators';
import {
  getBrand,
  getFacets,
  getSkinTerm,
} from '@/lib/actions/category.actions';
import { getListingProducts } from '@/lib/actions/product.actions';
import Listing from '@/components/shared/catalog/listing';
import SiteHeader from '@/components/shared/header';
import { alternates } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

// A skin concern's, a skin type's or a brand's landing page: every published product with that
// term, across the zones, and the other filters. Rendered on every request, as a catalog page.

export type LandingProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Locale = (typeof routing.locales)[number];

const landings = {
  concern: {
    path: 'concern',
    field: 'skinConcerns',
    getTerm: (slug: string, locale: Locale) =>
      getSkinTerm('skin-concerns', slug, locale),
  },
  type: {
    path: 'skin-type',
    field: 'skinTypes',
    getTerm: (slug: string, locale: Locale) =>
      getSkinTerm('skin-types', slug, locale),
  },
  brand: { path: 'brand', field: 'brand', getTerm: getBrand },
} as const;

export function landing(facet: keyof typeof landings) {
  const { path, field, getTerm } = landings[facet];

  async function generateMetadata({
    params,
    searchParams,
  }: LandingProps): Promise<Metadata> {
    const { locale, slug } = await params;
    if (!hasLocale(routing.locales, locale)) return {};
    const term = await getTerm(slug, locale);
    if (!term) return {};
    const t = await getTranslations({ locale, namespace: 'Catalog' });
    const { page } = listingParams.parse(await searchParams);
    return {
      title: t('landingTitle', {
        kind: t(`facets.${facet}`),
        title: term.title,
      }),
      alternates: alternates(
        `/${path}/${slug}${page > 1 ? `?page=${page}` : ''}`,
        locale,
      ),
    };
  }

  async function LandingPage({ params, searchParams }: LandingProps) {
    const { locale, slug } = await params;
    if (!hasLocale(routing.locales, locale)) notFound();
    const term = await getTerm(slug, locale);
    if (!term) notFound();

    const t = await getTranslations('Catalog');
    const query = listingParams.parse(await searchParams);
    const [products, facets] = await Promise.all([
      getListingProducts({ [field]: { in: [term.id] } }, locale),
      getFacets(locale),
    ]);
    // The page's own term is its subject, not a filter.
    const result = listing(
      products,
      facets.filter(({ key }) => key !== facet),
      query,
    );
    if (query.page > result.pageCount) notFound();

    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <Listing
          title={term.title}
          above={t(`facets.${facet}`)}
          result={result}
          params={query}
          basePath={`/${path}/${slug}`}
        />
      </div>
    );
  }

  return { generateMetadata, LandingPage };
}
