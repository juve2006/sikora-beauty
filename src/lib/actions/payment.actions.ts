import 'server-only';

import config from '@payload-config';
import { getPayload } from 'payload';

import { invoiceStatus, settle } from '@/lib/monobank';
import { cardRetryable } from '@/lib/orders';
import { whatFailed } from '@/lib/utils';
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
// later asks for no money the store would send back. For a card, where its payment stands and
// whether monobank's invoice was made. Access is skipped on purpose — no rule lets an anonymous visitor read an order, and
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
    select: {
      total: true,
      payment: true,
      status: true,
      paymentStatus: true,
      monoInvoiceId: true,
    },
  });
  const order = docs[0];
  return (
    order && {
      number: order.id,
      total: order.total,
      payment: order.payment,
      paymentStatus: order.paymentStatus,
      cancelled: order.status === 'cancelled',
      invoiced: Boolean(order.monoInvoiceId),
      payable:
        order.paymentStatus === 'awaiting' && order.status !== 'cancelled',
      retry: cardRetryable(order),
    }
  );
};

// Back from monobank's page, before the webhook or with it lost: mono itself is asked, for at most
// three seconds, and its word moves the order as the webhook's would. Nothing here may spoil the
// page: no answer leaves the order as it is. Access is skipped as above, and only the invoice is
// selected, for mono.
export const checkCard = async (token: string) => {
  try {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: 'orders',
      where: {
        and: [
          { returnToken: { equals: token } },
          { payment: { equals: 'card' } },
          { paymentStatus: { equals: 'awaiting' } },
          { status: { not_equals: 'cancelled' } },
          { monoInvoiceId: { exists: true } },
        ],
      },
      depth: 0,
      limit: 1,
      pagination: false,
      overrideAccess: true,
      select: { monoInvoiceId: true },
    });
    const invoiceId = docs[0]?.monoInvoiceId;
    if (!invoiceId) return;
    const { status } = await invoiceStatus(invoiceId, 3_000);
    await settle(payload, invoiceId, status);
  } catch (error) {
    console.error('monobank:', whatFailed(error));
  }
};

// The order as the thank-you page shows it: a card still waiting is asked of mono first. Read again
// whatever came of that, as the webhook may have moved it while mono was being asked.
export const getReturnedOrder = async (token: string) => {
  const order = await getPlacedOrder(token);
  if (order?.payment !== 'card' || !order.payable || !order.invoiced)
    return order;
  await checkCard(token);
  return getPlacedOrder(token);
};
