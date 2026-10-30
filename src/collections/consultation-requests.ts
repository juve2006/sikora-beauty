import type { CollectionConfig } from 'payload';

import { hasRole, isOwner, nobody } from '@/lib/access';
import { CONSULTATION_STATUSES } from '@/lib/constants';

const statusLabels = {
  new: 'Новий',
  in_progress: 'В роботі',
  closed: 'Закритий',
};

// What the shopper sent stays as sent, in the admin and through the API alike: the cosmetologist
// changes only the status. A field nobody may update the admin shows read-only.
const sent = { update: nobody };

// A shopper's request to be contacted by the cosmetologist (GLOSSARY: Consultation Request). Their
// name and phone are personal data: only an admin role reads them, nobody creates a request through
// the API — `requestConsultation` does, after Zod and Turnstile — and only the owner deletes one,
// when its author asks.
export const ConsultationRequests: CollectionConfig = {
  slug: 'consultation-requests',
  labels: {
    singular: 'Запит на консультацію',
    plural: 'Запити на консультацію',
  },
  admin: {
    group: 'Запити',
    useAsTitle: 'name',
    defaultColumns: ['createdAt', 'name', 'phone', 'status'],
  },
  defaultSort: '-createdAt',
  access: { read: hasRole, create: nobody, update: hasRole, delete: isOwner },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: "Ім'я",
      required: true,
      access: sent,
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Телефон',
      required: true,
      access: sent,
    },
    { name: 'message', type: 'textarea', label: 'Що турбує', access: sent },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      label: 'Товар',
      access: sent,
    },
    {
      name: 'locale',
      type: 'select',
      label: 'Мова',
      options: [
        { value: 'uk', label: 'Українська' },
        { value: 'en', label: 'Англійська' },
      ],
      access: sent,
    },
    {
      name: 'status',
      type: 'select',
      label: 'Статус',
      required: true,
      defaultValue: 'new',
      options: CONSULTATION_STATUSES.map((value) => ({
        value,
        label: statusLabels[value],
      })),
      admin: { position: 'sidebar', isClearable: false },
    },
  ],
};
