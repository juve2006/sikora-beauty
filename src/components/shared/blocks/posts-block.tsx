import { getTranslations } from 'next-intl/server';
import BlockHeading from './block-heading';
import PostGrid from '@/components/shared/blog/post-grid';
import { POSTS_IN_BLOCK } from '@/lib/constants';
import { getPosts } from '@/lib/actions/post.actions';
import type { Config } from '@/payload-types';
import type { BlockOf } from '@/types';

// The blog's newest posts and a link to all of them; with none published the block is not shown.
const PostsBlock = async ({
  block,
  locale,
}: {
  block: BlockOf<'posts'>;
  locale: Config['locale'];
}) => {
  const [{ docs }, t] = await Promise.all([
    getPosts(locale, 1, POSTS_IN_BLOCK),
    getTranslations('Blog'),
  ]);
  if (docs.length === 0) return null;
  return (
    <section className="pt-8 pb-6">
      <BlockHeading title={block.title} href="/blog" label={t('all')} />
      <PostGrid posts={docs} className="mt-6" />
    </section>
  );
};

export default PostsBlock;
