import type { TextField, TextFieldSingleValidation } from 'payload';

import { slugify } from '@/lib/utils';

// Latin, unique, one for both locales: a lookup by a localized slug has no fallback. A typed slug
// goes through slugify too: a list's URL carries slugs unencoded, comma-joined. One that slugify
// empties falls back to the name: returning undefined would make Payload keep it as typed.
// `validate` adds a collection's own rule for the slug it ends up with.
export function slugField(
  from: string,
  validate?: TextFieldSingleValidation,
): TextField {
  return {
    ...(validate && { validate }),
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
          slugify(String(value ?? '')) ||
          slugify(String(siblingData[from] ?? '')) ||
          undefined,
      ],
    },
  };
}
