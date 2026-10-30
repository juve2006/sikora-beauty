import type { TextField } from 'payload';

import { slugify } from '@/lib/utils';

// Latin, unique, one for both locales: a lookup by a localized slug has no fallback. A typed slug
// goes through slugify too: a list's URL carries slugs unencoded, comma-joined.
export function slugField(from: string): TextField {
  return {
    name: 'slug',
    type: 'text',
    label: 'Адреса (slug)',
    unique: true,
    index: true,
    admin: {
      position: 'sidebar',
      description: 'Латиницею. Порожнє — створиться з назви.',
    },
    hooks: {
      beforeValidate: [
        ({ value, siblingData }) =>
          slugify(String(value || siblingData[from] || '')) || undefined,
      ],
    },
  };
}
