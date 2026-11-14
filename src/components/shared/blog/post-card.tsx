import Image from 'next/image';
import PostDate from './post-date';
import { Link } from '@/i18n/navigation';
import { photos } from '@/lib/product-page';
import type { Post } from '@/payload-types';

export type CardPost = Pick<
  Post,
  'title' | 'slug' | 'publishedAt' | 'excerpt' | 'cover'
>;

// One post in the blog's list and in the block «Блог», one link: its cover, day, title and summary.
// Without a cover the frame stays, empty, so the titles of a row keep one line.
const PostCard = ({
  post,
  eager = false,
}: {
  post: CardPost;
  eager?: boolean;
}) => {
  const [cover] = photos(post.cover ? [post.cover] : []);
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col gap-4 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="relative aspect-3/2 overflow-hidden rounded-xl bg-muted">
        {cover && (
          <Image
            src={cover.url}
            alt={cover.alt}
            fill
            loading={eager ? 'eager' : 'lazy'}
            sizes="(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>
      <div className="flex flex-col items-start gap-2 px-0.5">
        {post.publishedAt && (
          <PostDate
            date={post.publishedAt}
            className="text-sm text-muted-foreground"
          />
        )}
        <span className="font-heading text-xl leading-snug text-balance group-hover:underline">
          {post.title}
        </span>
        {post.excerpt && (
          <span className="line-clamp-3 text-sm text-muted-foreground">
            {post.excerpt}
          </span>
        )}
      </div>
    </Link>
  );
};

export default PostCard;
