import type { GlobalConfig } from 'payload';

import { revalidateStorefront } from '@/collections/revalidate';
import { hasRole } from '@/lib/access';
import { instagramUrl, phone } from '@/lib/validators';

// The store's contacts in the footer: one screen of the admin, kept by both roles. What is left empty
// the footer does not show, so it never needs a contact the store does not have (task `site-footer`).
export const Contacts: GlobalConfig = {
  slug: 'contacts',
  label: 'Контакти',
  admin: { group: 'Сторінки' },
  access: { read: () => true, update: hasRole },
  hooks: { afterChange: [revalidateStorefront] },
  fields: [
    {
      name: 'phone',
      type: 'text',
      label: 'Телефон',
      admin: { description: 'На сайті показується так, як написано тут.' },
      validate: (value: unknown) =>
        !value ||
        phone.safeParse(value).success ||
        'Вкажіть український номер, наприклад 067 123 45 67',
    },
    { name: 'email', type: 'email', label: 'Пошта' },
    {
      name: 'instagram',
      type: 'text',
      label: 'Instagram',
      admin: { placeholder: 'https://www.instagram.com/…' },
      validate: (value: unknown) =>
        !value ||
        instagramUrl.safeParse(value).success ||
        'Вкажіть адресу сторінки: https://www.instagram.com/…',
    },
    {
      name: 'hours',
      type: 'textarea',
      label: 'Години роботи',
      localized: true,
      admin: { rows: 2 },
    },
    { name: 'address', type: 'text', label: 'Адреса', localized: true },
  ],
};
