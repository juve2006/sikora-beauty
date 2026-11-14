import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { getPost } from '@/lib/actions/post.actions';
import { photos } from '@/lib/product-page';
import PageBlocks from '@/components/shared/blocks/page-blocks';
import PostDate from '@/components/shared/blog/post-date';
import { alternates } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string; slug: string }> };

// A published post at `/blog/<slug>`: its day, title, summary and cover, then its blocks, as a page's.
// Nothing is rendered at build: it renders on its first visit and is kept until a save revalidates
// the storefront, as a page by slug is.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const post = await getPost(slug, locale);
  if (!post) return {};
  const [cover] = photos(post.cover ? [post.cover] : []);
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: alternates(`/blog/${slug}`, locale),
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt ?? undefined,
      publishedTime: post.publishedAt ?? undefined,
      images: cover && [cover],
    },
  };
}

const PostPage = async ({ params }: Props) => {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const post = await getPost(slug, locale);
  if (!post) notFound();
  const [cover] = photos(post.cover ? [post.cover] : []);
  return (
    <PageBlocks
      title={post.title}
      description={post.excerpt ?? undefined}
      blocks={post.blocks ?? []}
      locale={locale}
    >
      {post.publishedAt && (
        <PostDate
          date={post.publishedAt}
          className="mt-4 block text-sm text-muted-foreground"
        />
      )}
      {cover && (
        <div className="relative mt-8 aspect-3/2 overflow-hidden rounded-xl bg-muted lg:aspect-21/9">
          <Image
            src={cover.url}
            alt={cover.alt}
            fill
            priority
            sizes="(min-width: 1440px) 1312px, 100vw"
            className="object-cover"
          />
        </div>
      )}
    </PageBlocks>
  );
};

export default PostPage;
