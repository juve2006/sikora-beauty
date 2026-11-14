import 'server-only';

import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

import { POSTS_PAGE_SIZE } from '@/lib/constants';
import type { Config } from '@/payload-types';

type Locale = Config['locale'];

// A published post by its address, in the page's language. Cached per request: the page and its
// metadata read the same one.
export const getPost = cache(async (slug: string, locale: Locale) => {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    locale,
    depth: 1,
    limit: 1,
    overrideAccess: false,
  });
  return docs[0] ?? null;
});

// A page of published posts, the newest first, with what their cards show and no blocks.
export async function getPosts(
  locale: Locale,
  page = 1,
  limit = POSTS_PAGE_SIZE,
) {
  const payload = await getPayload({ config });
  return payload.find({
    collection: 'posts',
    locale,
    depth: 1,
    page,
    limit,
    sort: '-publishedAt',
    overrideAccess: false,
    select: {
      title: true,
      slug: true,
      publishedAt: true,
      excerpt: true,
      cover: true,
    },
  });
}
