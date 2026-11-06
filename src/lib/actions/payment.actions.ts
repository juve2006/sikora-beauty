import 'server-only';

import config from '@payload-config';
import { getPayload } from 'payload';

import type { PaymentDetails } from '@/types';

// The store's account a transfer goes to, once all three are filled in: none until then, and the
// checkout does not offer a transfer.
export const getPaymentDetails = async (): Promise<
  PaymentDetails | undefined
> => {
  const payload = await getPayload({ config });
  const { recipient, iban, code } = await payload.findGlobal({
    slug: 'payment-details',
    depth: 0,
    overrideAccess: false,
  });
  return recipient?.trim() && iban && code
    ? { recipient: recipient.trim(), iban, code }
    : undefined;
};

// The order the thank-you page names, by the secret its checkout was given: its number, sum and
// payment, and whether it still waits to be paid — not once paid or cancelled, so a link kept for
// later asks for no money the store would send back. Access is skipped on purpose — no rule lets an anonymous visitor read an order, and
// the token's field is closed to every reader but this one — so whatever `select` adds, anyone
// holding the link reads (RULES.md).
export const getPlacedOrder = async (token: string) => {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'orders',
    where: { returnToken: { equals: token } },
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    select: { total: true, payment: true, status: true, paymentStatus: true },
  });
  const order = docs[0];
  return (
    order && {
      number: order.id,
      total: order.total,
      payment: order.payment,
      payable:
        order.paymentStatus === 'awaiting' && order.status !== 'cancelled',
    }
  );
};
