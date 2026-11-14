import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getPosts } from '@/lib/actions/post.actions';
import { listingParams } from '@/lib/validators';
import PostGrid from '@/components/shared/blog/post-grid';
import ListingPagination from '@/components/shared/catalog/listing-pagination';
import { alternates } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Rendered on every request and never at build: it reads `?page=`, and the layout reads Payload
// (RULES.md).
export const dynamic = 'force-dynamic';

const pageParam = listingParams.pick({ page: true });
const path = (page: number) => (page > 1 ? `/blog?page=${page}` : '/blog');

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Blog' });
  const { page } = pageParam.parse(await searchParams);
  return { title: t('title'), alternates: alternates(path(page), locale) };
}

// The blog: its published posts, the newest first, a page at a time.
const BlogPage = async ({ params, searchParams }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const { page } = pageParam.parse(await searchParams);
  const [posts, t] = await Promise.all([
    getPosts(locale, page),
    getTranslations('Blog'),
  ]);
  if (page > Math.max(1, posts.totalPages)) notFound();
  return (
    <main className="mx-auto w-full max-w-page flex-1 px-4 pb-16 sm:px-6 lg:px-16">
      <h1 className="pt-10 text-3xl leading-tight font-semibold tracking-tight text-balance sm:pt-16 sm:text-4xl">
        {t('title')}
      </h1>
      {posts.docs.length > 0 ? (
        <PostGrid posts={posts.docs} eager={page === 1} className="mt-8" />
      ) : (
        <p className="mt-4 text-lg text-muted-foreground">{t('empty')}</p>
      )}
      <div className="mt-12">
        <ListingPagination
          page={page}
          pageCount={posts.totalPages}
          href={path}
        />
      </div>
    </main>
  );
};

export default BlogPage;
