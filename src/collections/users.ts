import {
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
  type CollectionConfig,
  Forbidden,
} from 'payload';

import {
  hasRole,
  isOwner,
  notSelf,
  ownerField,
  ownerNotSelf,
  ownerOrSelf,
} from '@/lib/access';
import { markAccessWrites } from '@/lib/auth-writes';
import { LETTER_INTERVAL, ROLE_LABELS, ROLES } from '@/lib/constants';
import { staffResetLetter } from '@/lib/email';

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

// A reset letter only through the store's form, behind Turnstile: REST's forgot-password has no access
// rule, and each request holds a pool client while it asks for another.
export const resetLetterThroughStore: CollectionBeforeOperationHook = ({
  args,
  operation,
  req,
}) => {
  if (operation === 'forgotPassword' && req.payloadAPI !== 'local')
    throw new Forbidden(req.t);
  return args;
};

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Користувач', plural: 'Користувачі' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role'],
  },
  auth: {
    // The one cookie Payload has, a shopper's session too (customers.ts).
    cookies: { secure: process.env.NODE_ENV === 'production' },
    // SMTP sends real letters now: every 15 seconds, Payload's default, would spend Gmail's daily
    // limit and leave shoppers without theirs.
    forgotPassword: {
      minRequestInterval: LETTER_INTERVAL,
      generateEmailSubject: (args) =>
        staffResetLetter(String(args?.token)).subject,
      generateEmailHTML: (args) => staffResetLetter(String(args?.token)).html,
    },
  },
  access: {
    admin: hasRole,
    read: ownerOrSelf,
    create: isOwner,
    update: ownerOrSelf,
    delete: notSelf,
    unlock: isOwner,
  },
  graphQL: { disableMutations: true },
  hooks: {
    beforeChange: [firstUserIsOwner],
    beforeOperation: [resetLetterThroughStore, markAccessWrites],
  },
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
