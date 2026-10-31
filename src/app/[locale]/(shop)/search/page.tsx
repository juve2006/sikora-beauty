import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Form from 'next/form';
import { notFound } from 'next/navigation';
import { after } from 'next/server';

import SearchEmpty from './search-empty';
import { recordSearchMiss, searchProducts } from '@/lib/actions/search.actions';
import { SEARCH_LIMIT } from '@/lib/constants';
import { searchQuery } from '@/lib/validators';
import ProductCard from '@/components/shared/product/product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

// Rendered on every request and never at build: the layout's header reads Payload, and `next build`
// has no database (RULES.md). Reading `searchParams` stops the page, not the layout.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Search' });
  // Endless addresses with the same products: a results page is never indexed.
  return { title: t('title'), robots: { index: false } };
}

// Search's results: what a query finds, the closest first, up to SEARCH_LIMIT and without pages. A
// query that finds nothing is recorded for the admin's «Пошук без результатів» once the page is
// sent.
const SearchPage = async ({ params, searchParams }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const { q } = await searchParams;
  const parsed = searchQuery.safeParse(q);
  const query = parsed.success ? parsed.data : null;

  const t = await getTranslations('Search');
  const result = query
    ? await searchProducts(query, locale, SEARCH_LIMIT)
    : null;
  if (query && result?.total === 0)
    after(() => recordSearchMiss(query, locale));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
      <h1 className="pt-2 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl lg:pt-8">
        {t('title')}
      </h1>
      <Form
        action={getPathname({ href: '/search', locale })}
        role="search"
        className="mt-6 flex max-w-xl gap-2"
      >
        <Input
          key={query}
          type="search"
          name="q"
          defaultValue={Array.isArray(q) ? q[0] : q}
          maxLength={100}
          aria-label={t('label')}
          placeholder={t('placeholder')}
        />
        <Button type="submit">{t('submit')}</Button>
      </Form>
      {!query || !result ? (
        <p className="mt-6 text-muted-foreground">{t('hint')}</p>
      ) : result.total === 0 ? (
        <SearchEmpty query={query} className="mt-8" />
      ) : (
        <>
          <p className="mt-6 text-sm text-muted-foreground">
            {t('found', { count: result.total })}
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {result.products.map((product, index) => (
              <li key={product.id}>
                <ProductCard product={product.card} eager={index < 4} />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
};

export default SearchPage;
