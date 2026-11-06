'use server';

import config from '@payload-config';
import { after } from 'next/server';
import { getPayload } from 'payload';

import type { CardPaymentState } from '@/types';
import { SITE_URL } from '@/lib/constants';
import { cardEnabled, createInvoice } from '@/lib/monobank';
import { basketOrder } from '@/lib/orders';
import { cardMessage, sendTelegram } from '@/lib/telegram';
import { whatFailed } from '@/lib/utils';
import { cardPayment } from '@/lib/validators';

// A card payment for an order the checkout has just placed: monobank's invoice for the sum the
// database has, and the page to pay on. The order is found by the secret its browser holds, and only
// one paid by card, still awaiting and without an invoice is paid here — a second call makes none;
// `mono-reconcile`'s retry will come through here too. The receipt's address goes to mono and is not
// kept. When mono makes no invoice the order is kept and its payment becomes a link the manager
// sends, and the manager is told.
// ponytail: two calls at once would make two invoices and keep the later one; the checkout sends one.
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
      paymentStatus: true,
      monoInvoiceId: true,
      locale: true,
    },
  });
  const order = docs[0];
  if (
    !order ||
    order.payment !== 'card' ||
    order.paymentStatus !== 'awaiting' ||
    order.monoInvoiceId
  )
    return { status: 'none' };

  try {
    if (!cardEnabled()) throw new Error('no MONO_TOKEN');
    const thanks = `${order.locale === 'en' ? '/en' : ''}/cart/thanks?t=${parsed.data.token}`;
    const invoice = await createInvoice({
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
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { monoInvoiceId: invoice.invoiceId },
    });
    return { status: 'pay', url: invoice.pageUrl };
  } catch (error) {
    console.error('monobank:', whatFailed(error));
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
}
