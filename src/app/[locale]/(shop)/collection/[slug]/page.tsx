import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { COLLECTIONS } from '@/lib/constants';
import { listing } from '@/lib/listing';
import { listingParams } from '@/lib/validators';
import { getFacets } from '@/lib/actions/category.actions';
import { getListingProducts } from '@/lib/actions/product.actions';
import Listing from '@/components/shared/catalog/listing';
import { alternates } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import type { LandingProps } from '../../landing';

// A collection's page: every published product with its flag, and every filter. The collections
// are a fixed list, so an unknown one is 404 without asking the database.

const isCollection = (slug: string): slug is keyof typeof COLLECTIONS =>
  Object.hasOwn(COLLECTIONS, slug);

export async function generateMetadata({
  params,
  searchParams,
}: LandingProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale) || !isCollection(slug)) return {};
  const t = await getTranslations({ locale, namespace: 'Catalog' });
  const { page } = listingParams.parse(await searchParams);
  return {
    title: t(`collections.${slug}`),
    alternates: alternates(
      `/collection/${slug}${page > 1 ? `?page=${page}` : ''}`,
      locale,
    ),
  };
}

const CollectionPage = async ({ params, searchParams }: LandingProps) => {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale) || !isCollection(slug)) notFound();

  const t = await getTranslations('Catalog');
  const query = listingParams.parse(await searchParams);
  const [products, facets] = await Promise.all([
    getListingProducts({ [COLLECTIONS[slug]]: { equals: true } }, locale),
    getFacets(locale),
  ]);
  const result = listing(products, facets, query);
  if (query.page > result.pageCount) notFound();

  return (
    <Listing
      title={t(`collections.${slug}`)}
      result={result}
      params={query}
      basePath={`/collection/${slug}`}
    />
  );
};

export default CollectionPage;
