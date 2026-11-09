'use server';

import config from '@payload-config';
import { after } from 'next/server';
import { getPayload } from 'payload';

import type { CardPaymentState } from '@/types';
import { SITE_URL } from '@/lib/constants';
import {
  cardEnabled,
  createInvoice,
  invoiceStatus,
  settle,
} from '@/lib/monobank';
import { basketOrder, cardRetryable } from '@/lib/orders';
import { cardMessage, sendTelegram } from '@/lib/telegram';
import { whatFailed } from '@/lib/utils';
import { cardPayment } from '@/lib/validators';

// A card payment for an order just placed, or another try at one that failed: monobank's invoice for
// the sum the database has, and the page to pay on. The order is found by the secret its browser
// holds, and only `cardRetryable` is paid here. The receipt's address goes to mono and is not kept.
// An invoice before another: mono is asked first what became of it, as it may be paid after all, or
// still open — and only one it refused or let expire gives way. When mono makes no first invoice the
// order is kept and its payment becomes a link the manager sends, and the manager is told; on another
// try it stays failed, with the shopper able to try once more. An invoice is saved by one statement
// on the order as it was read: of two tabs one keeps its invoice, and one not kept is never paid.
export async function payByCard(
  token: string,
  email: string,
): Promise<CardPaymentState> {
  const parsed = cardPayment.safeParse({ token, email });
  if (!parsed.data) return { status: 'none' };
  const payload = await getPayload({ config });
  // Not the storefront's read of the order: the secret's holder pays for it, and nothing a shopper
  // typed is selected.
  const { docs } = await payload.find({
    collection: 'orders',
    where: { returnToken: { equals: parsed.data.token } },
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    select: {
      total: true,
      lines: true,
      payment: true,
      status: true,
      paymentStatus: true,
      monoInvoiceId: true,
      locale: true,
    },
  });
  const order = docs[0];
  if (!order || !cardRetryable(order)) return { status: 'none' };

  let invoice: Awaited<ReturnType<typeof createInvoice>>;
  try {
    if (!cardEnabled()) throw new Error('no MONO_TOKEN');
    if (order.monoInvoiceId) {
      const { status } = await invoiceStatus(order.monoInvoiceId);
      await settle(payload, order.monoInvoiceId, status);
      if (status !== 'failure' && status !== 'expired')
        return { status: 'none' };
    }
    const thanks = `${order.locale === 'en' ? '/en' : ''}/cart/thanks?t=${parsed.data.token}`;
    invoice = await createInvoice({
      amount: order.total,
      merchantPaymInfo: {
        reference: String(order.id),
        destination: `Оплата замовлення №${order.id}`,
        basketOrder: basketOrder(order.lines),
        customerEmails: [parsed.data.email],
      },
      redirectUrl: new URL(thanks, SITE_URL).href,
      webHookUrl: new URL('/api/mono/webhook', SITE_URL).href,
    });
  } catch (error) {
    console.error('monobank:', whatFailed(error));
    if (order.paymentStatus === 'failed') return { status: 'none' };
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { payment: 'link' },
    });
    after(() =>
      sendTelegram(cardMessage(order, 'link', SITE_URL)).catch((error) =>
        console.error('Telegram:', whatFailed(error)),
      ),
    );
    return { status: 'link' };
  }

  const kept = await payload.db
    .updateOne({
      collection: 'orders',
      data: {
        monoInvoiceId: invoice.invoiceId,
        paymentStatus: 'awaiting',
        updatedAt: new Date().toISOString(),
      },
      options: { atomic: true },
      where: {
        and: [
          { id: { equals: order.id } },
          { status: { in: ['new', 'confirmed'] } },
          { paymentStatus: { equals: order.paymentStatus } },
          {
            monoInvoiceId: order.monoInvoiceId
              ? { equals: order.monoInvoiceId }
              : { exists: false },
          },
        ],
      },
    })
    .catch((error: unknown) => {
      console.error('monobank:', whatFailed(error));
      return null;
    });
  return kept ? { status: 'pay', url: invoice.pageUrl } : { status: 'none' };
}
