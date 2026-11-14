import { cn } from 'cn';
import PostCard, { type CardPost } from './post-card';

// Posts in a grid: one a row on a phone, two from sm, three from lg.
const PostGrid = ({
  posts,
  eager = false,
  className,
}: {
  posts: CardPost[];
  // The first row of the blog's page is its largest paint.
  eager?: boolean;
  className?: string;
}) => (
  <ul
    className={cn(
      'grid gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3',
      className,
    )}
  >
    {posts.map((post, index) => (
      <li key={post.slug ?? index}>
        <PostCard post={post} eager={eager && index < 3} />
      </li>
    ))}
  </ul>
);

export default PostGrid;
