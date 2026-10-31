import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import FavoritesList from './favorites-list';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

// Rendered on every request and never at build: the layout's header reads Payload, and `next build`
// has no database (RULES.md).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Favorites' });
  // One browser's own list: nothing for a search engine.
  return { title: t('title'), robots: { index: false } };
}

// The products this browser keeps as favorites. The server does not know them; the list asks for
// their cards once it runs.
const FavoritesPage = async ({ params }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations('Favorites');
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
      <h1 className="pt-2 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl lg:pt-8">
        {t('title')}
      </h1>
      <FavoritesList />
    </main>
  );
};

export default FavoritesPage;
