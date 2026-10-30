import 'server-only';

import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

import type { Config } from '@/payload-types';

// A storefront page by its address, in the page's language; `home` is the home page. Cached per
// request: the page and its metadata read the same one.
export const getPage = cache(async (slug: string, locale: Config['locale']) => {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    locale,
    depth: 1,
    limit: 1,
    overrideAccess: false,
  });
  return docs[0] ?? null;
});
