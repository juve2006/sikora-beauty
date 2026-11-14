import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getBrands } from '@/lib/actions/category.actions';
import BrandTile from '@/components/shared/brand/brand-tile';
import { alternates } from '@/i18n/navigation';
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

// Every brand with a published product, by name, as a tile with its logo.
const BrandsPage = async ({ params }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations('Catalog');
  const brands = await getBrands(locale);

  return (
    <main className="mx-auto w-full max-w-page flex-1 px-4 pb-16 sm:px-6 lg:px-16">
      <h1 className="pt-2 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl lg:pt-8">
        {t('brands')}
      </h1>
      {brands.length > 0 ? (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {brands.map((brand) => (
            <li key={brand.slug}>
              <BrandTile
                title={brand.title}
                logo={brand.logo}
                href={`/brand/${brand.slug}`}
              />
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
