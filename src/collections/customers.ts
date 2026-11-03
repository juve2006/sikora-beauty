import {
  type CollectionBeforeOperationHook,
  type CollectionConfig,
  Forbidden,
} from 'payload';

import { isOwner, nobody, staffOrSelf } from '@/lib/access';
import { markAccessWrites } from '@/lib/auth-writes';
import { CUSTOMER_SESSION_SECONDS, LETTER_INTERVAL } from '@/lib/constants';
import { resetLetter, verifyLetter } from '@/lib/email';

// An account is made and a reset letter sent only by the server actions, behind Zod and Turnstile.
// `create: nobody` does not stop REST's first-register, which skips access and on an empty table
// makes an account already verified; forgot-password has no access rule at all; REST's reset-password
// would take a password Zod refuses; the store refreshes no session, and REST's refresh would write an
// old copy of them back. `verify` has no such hook, and stays: only the mailbox has its token.
export const onlyThroughActions: CollectionBeforeOperationHook = ({
  args,
  operation,
  req,
}) => {
  if (
    (operation === 'create' ||
      operation === 'forgotPassword' ||
      operation === 'resetPassword' ||
      operation === 'refresh') &&
    req.payloadAPI !== 'local'
  )
    throw new Forbidden(req.t);
  return args;
};

// A shopper's account (adr-20261103-customer-accounts): a Payload session, so `src/lib/access.ts`
// keeps it from everything staff may do. They change their own data through `updateProfile`, never
// through this API; the owner deletes an account when asked, and the orders stay.
export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Покупець', plural: 'Покупці' },
  admin: {
    group: 'Продажі',
    useAsTitle: 'email',
    defaultColumns: ['email', 'firstName', 'lastName', 'phone', 'createdAt'],
  },
  defaultSort: '-createdAt',
  auth: {
    tokenExpiration: CUSTOMER_SESSION_SECONDS,
    // The session stays in its HttpOnly cookie: `/api/customers/me` does not hand it to a script.
    removeTokenFromResponses: true,
    cookies: { secure: process.env.NODE_ENV === 'production' },
    verify: {
      generateEmailSubject: ({ token, user }) =>
        verifyLetter(String(token), user?.locale).subject,
      generateEmailHTML: ({ token, user }) =>
        verifyLetter(String(token), user?.locale).html,
    },
    forgotPassword: {
      minRequestInterval: LETTER_INTERVAL,
      generateEmailSubject: (args) =>
        resetLetter(String(args?.token), args?.user?.locale).subject,
      generateEmailHTML: (args) =>
        resetLetter(String(args?.token), args?.user?.locale).html,
    },
  },
  access: {
    admin: nobody,
    read: staffOrSelf,
    create: nobody,
    update: isOwner,
    delete: isOwner,
    unlock: isOwner,
  },
  graphQL: { disableMutations: true },
  hooks: { beforeOperation: [onlyThroughActions, markAccessWrites] },
  fields: [
    // Email added by default
    {
      type: 'row',
      fields: [
        { name: 'firstName', type: 'text', label: "Ім'я", required: true },
        { name: 'lastName', type: 'text', label: 'Прізвище', required: true },
        { name: 'phone', type: 'text', label: 'Телефон' },
      ],
    },
    // When the last letter of confirmation went, `createdAt` until then: one per LETTER_INTERVAL.
    { name: 'verificationSentAt', type: 'date', hidden: true },
    // The language of their letters: the one they registered in.
    {
      name: 'locale',
      type: 'select',
      label: 'Мова',
      options: [
        { value: 'uk', label: 'Українська' },
        { value: 'en', label: 'Англійська' },
      ],
    },
  ],
};
