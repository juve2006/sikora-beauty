import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';

import { getPage } from '@/lib/actions/page.actions';
import PageBlocks from '@/components/shared/blocks/page-blocks';
import { alternates } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string; slug: string }> };

// A page from the admin at its own address — the about page, later the terms. `home` is `/`, not
// `/home`. Nothing is rendered at build: a page renders on its first visit and is kept until a save
// revalidates the storefront, as a product page is.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale) || slug === 'home') return {};
  const page = await getPage(slug, locale);
  return page
    ? { title: page.title, alternates: alternates(`/${slug}`, locale) }
    : {};
}

const Page = async ({ params }: Props) => {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale) || slug === 'home') notFound();
  const page = await getPage(slug, locale);
  if (!page) notFound();
  return (
    <PageBlocks title={page.title} blocks={page.blocks ?? []} locale={locale} />
  );
};

export default Page;
