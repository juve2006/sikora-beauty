import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { listing } from '@/lib/listing';
import { listingParams } from '@/lib/validators';
import { getFacets } from '@/lib/actions/category.actions';
import { getListingProducts } from '@/lib/actions/product.actions';
import { alternates, Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

// Rendered on every request and never at build: the layout's header reads Payload, and `next build`
// has no database (RULES.md).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Catalog' });
  return { title: t('brands'), alternates: alternates('/brands', locale) };
}

// Every brand with a published product, by name, with how many it has, as a catalog page shows
// them.
const BrandsPage = async ({ params }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations('Catalog');
  const [products, facets] = await Promise.all([
    getListingProducts({}, locale),
    getFacets(locale),
  ]);
  // listing() counts a brand's products and leaves out a brand with none.
  const brands =
    listing(
      products,
      facets.filter(({ key }) => key === 'brand'),
      listingParams.parse({}),
    ).facets[0]?.values ?? [];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
      <h1 className="pt-2 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl lg:pt-8">
        {t('brands')}
      </h1>
      {brands.length > 0 ? (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <li key={brand.slug}>
              <Link
                href={`/brand/${brand.slug}`}
                className="flex min-h-16 flex-col justify-center rounded-lg border px-4 py-3 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="font-medium">{brand.title}</span>
                <span className="text-sm text-muted-foreground">
                  {t('count', { count: brand.count })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-muted-foreground">{t('empty')}</p>
      )}
    </main>
  );
};

export default BrandsPage;
