import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getPage } from '@/lib/actions/page.actions';
import PageBlocks from '@/components/shared/blocks/page-blocks';
import { alternates } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

// Rendered on every request and never at build: the layout's header reads Payload, and `next build`
// has no database (RULES.md).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return { alternates: alternates('/', locale) };
}

// The page `home` from the admin; without it, or without its blocks, the store's name and what it
// sells — never an empty page.
const HomePage = async ({ params }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const [page, t] = await Promise.all([
    getPage('home', locale),
    getTranslations('Metadata'),
  ]);
  return (
    <PageBlocks
      title={t('title')}
      description={t('description')}
      blocks={page?.blocks ?? []}
      locale={locale}
    />
  );
};

export default HomePage;
