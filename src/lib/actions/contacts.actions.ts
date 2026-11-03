import 'server-only';

import config from '@payload-config';
import { getPayload } from 'payload';

import type { Config } from '@/payload-types';

// The footer's read of the store's contacts, in the page's language.
export const getContacts = async (locale: Config['locale']) => {
  const payload = await getPayload({ config });
  return payload.findGlobal({
    slug: 'contacts',
    locale,
    depth: 0,
    overrideAccess: false,
  });
};
