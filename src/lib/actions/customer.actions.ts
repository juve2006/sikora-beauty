import 'server-only';

import config from '@payload-config';
import { headers } from 'next/headers';
import { getPayload } from 'payload';

import { CUSTOMER_ORDERS } from '@/lib/constants';
import { accountToken } from '@/lib/validators';
import type { Customer } from '@/payload-types';

// Who this request is signed in as. Reads the cookie, so only a page that is never cached may ask
// (RULES.md): the account's pages, the cart and /canvas.
export const sessionUser = async () => {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  return user;
};

export const currentCustomer = async () => {
  const user = await sessionUser();
  return user?.collection === 'customers' ? user : null;
};

// Their orders, as the collection's access lets them read: never the manager's note. The latest
// ones, no pages.
// ponytail: a page of CUSTOMER_ORDERS, pagination when a shopper has more.
export const myOrders = async (customer: Customer) => {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'orders',
    where: { customer: { equals: customer.id } },
    user: customer,
    overrideAccess: false,
    depth: 0,
    limit: CUSTOMER_ORDERS,
    sort: '-createdAt',
    select: { createdAt: true, status: true, total: true, lines: true },
  });
  return docs;
};

// A letter's token, if an account still waits for it; a used or forged one is null. Only reads:
// Chromium may request a first visit twice (`Critical-CH`) and a mail scanner opens links by itself,
// so opening the link confirms nothing. `signIn` does, with the account's password.
export const waitingToken = async (token: unknown) => {
  const parsed = accountToken.safeParse(token);
  if (!parsed.success) return null;
  const payload = await getPayload({ config });
  const { totalDocs } = await payload.count({
    collection: 'customers',
    where: { _verificationToken: { equals: parsed.data } },
  });
  return totalDocs > 0 ? parsed.data : null;
};
