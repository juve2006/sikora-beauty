import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload';

import {
  hasRole,
  isOwner,
  notSelf,
  ownerField,
  ownerNotSelf,
  ownerOrSelf,
} from '@/lib/access';
import { ROLE_LABELS, ROLES } from '@/lib/constants';

// The first user, created on an empty database, runs the store. Payload creates it with access
// skipped, so the role it gets is set here, whatever the form sent.
const firstUserIsOwner: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create') return data;
  const { totalDocs } = await req.payload.count({ collection: 'users', req });
  return totalDocs === 0 ? { ...data, role: 'owner' } : data;
};

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Користувач', plural: 'Користувачі' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role'],
  },
  auth: true,
  access: {
    admin: hasRole,
    read: ownerOrSelf,
    create: isOwner,
    update: ownerOrSelf,
    delete: notSelf,
    unlock: isOwner,
  },
  hooks: { beforeChange: [firstUserIsOwner] },
  fields: [
    // Email added by default
    {
      name: 'role',
      type: 'select',
      label: 'Роль',
      required: true,
      // The narrower role: the owner picks «Власник» on purpose.
      defaultValue: 'cosmetologist',
      options: ROLES.map((value) => ({ value, label: ROLE_LABELS[value] })),
      access: { create: ownerField, update: ownerNotSelf },
      // The first user's form, where nobody is logged in yet, would offer a choice the hook overrides.
      admin: { condition: (_, __, { user }) => Boolean(user) },
    },
  ],
};
