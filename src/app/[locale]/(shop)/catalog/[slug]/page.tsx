import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { listing, listingSearch } from '@/lib/listing';
import { listingParams } from '@/lib/validators';
import { getCatalogTerm, getFacets } from '@/lib/actions/category.actions';
import { getListingProducts } from '@/lib/actions/product.actions';
import CategoryNav from './category-nav';
import Listing from '@/components/shared/catalog/listing';
import SiteHeader from '@/components/shared/header';
import { alternates, Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// A zone or a category: one slug space, the slugs are unique across both (src/db/seed-data.ts).
// The page reads its URL parameters, so it renders on every request and never at build time, and
// a change in the admin shows at once (RULES.md).

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const found = await getCatalogTerm(slug, locale);
  if (!found) return {};
  // Filters and order are the same page; its other pages are pages of their own.
  const { page } = listingParams.parse(await searchParams);
  return {
    title: found.term.title,
    alternates: alternates(
      `/catalog/${slug}${page > 1 ? `?page=${page}` : ''}`,
      locale,
    ),
  };
}

const CatalogPage = async ({ params, searchParams }: Props) => {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const found = await getCatalogTerm(slug, locale);
  if (!found) notFound();
  const { term, zone, categories } = found;

  const query = listingParams.parse(await searchParams);
  // The zone's products either way: a category is one of them, and the zone's links show only the
  // categories that have any.
  const [products, facets] = await Promise.all([
    categories.length > 0
      ? getListingProducts(
          { categories: { in: categories.map(({ id }) => id) } },
          locale,
        )
      : [],
    getFacets(locale),
  ]);
  const inTerm =
    term.id === zone.id
      ? products
      : products.filter((product) => product.categories.includes(term.id));
  const result = listing(inTerm, facets, query);
  if (query.page > result.pageCount) notFound();
  const stocked = categories.filter(({ id }) =>
    products.some((product) => product.categories.includes(id)),
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <Listing
        title={term.title}
        above={
          term.id !== zone.id && (
            <Link href={`/catalog/${zone.slug}`} className="hover:underline">
              {zone.title}
            </Link>
          )
        }
        nav={
          stocked.length > 0 && (
            <CategoryNav
              zone={zone}
              categories={stocked}
              current={slug}
              search={listingSearch(query, {})}
            />
          )
        }
        result={result}
        params={query}
        basePath={`/catalog/${slug}`}
      />
    </div>
  );
};

export default CatalogPage;
