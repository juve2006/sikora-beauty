import type { CollectionConfig } from 'payload';
import { editors, servedOrStaff } from '@/lib/access';
import { storefrontHooks } from './revalidate';

// Stored in Vercel Blob on Vercel (payload.config.ts), on the local disk without its token.
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Фото', plural: 'Фото' },
  admin: { group: 'Каталог' },
  access: { read: servedOrStaff, ...editors },
  hooks: storefrontHooks,
  upload: { mimeTypes: ['image/*'] },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Що на фото (для незрячих і пошуку)',
      localized: true,
      required: true,
    },
  ],
};
