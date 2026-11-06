'use server';

import config from '@payload-config';
import { randomBytes } from 'node:crypto';
import { after } from 'next/server';
import { getPayload } from 'payload';

import type { OrderState } from '@/types';
import { currentCustomer } from '@/lib/actions/customer.actions';
import { getPaymentDetails } from '@/lib/actions/payment.actions';
import { SITE_URL } from '@/lib/constants';
import { canPrepay, priceOrder } from '@/lib/orders';
import { brandName } from '@/lib/product-page';
import { orderMessage, sendTelegram } from '@/lib/telegram';
import { verifyTurnstile } from '@/lib/turnstile';
import { whatFailed } from '@/lib/utils';
import { parseOrderForm } from '@/lib/validators';

// The one way an order is created (the collection's `create` is closed to everyone): the form's
// fields, then Turnstile, then the database's prices — never the browser's (RULES.md) — then the
// record, with the Local API's access skipped, as only this action writes. A transfer and a card are
// paid ahead, so they take an order wholly in stock: one whose line has stopped being so is a cart
// that changed; and for a transfer the store's account must be filled in, or there is nowhere to pay.
// A card's invoice is not made here — payments depend on orders, not the other way (ARCHITECTURE):
// the checkout asks `payByCard` next, with the receipt's address, which the order does not keep.
// The answer carries the order's secret, by which the thank-you page finds it. Telegram is told
// after the answer: an order it does not get still waits in the admin, so the shopper is never told
// it failed.
export async function placeOrder(
  _: OrderState,
  form: FormData,
): Promise<OrderState> {
  const parsed = parseOrderForm(form);
  if (!parsed.data)
    return Object.keys(parsed.errors).length > 0
      ? { status: 'invalid', errors: parsed.errors }
      : { status: 'failed' };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { token, lines, total, email, ...order } = parsed.data;
  if (!(await verifyTurnstile(token))) return { status: 'failed' };

  try {
    if (order.payment === 'transfer' && !(await getPaymentDetails()))
      return { status: 'failed' };
    const payload = await getPayload({ config });
    // Published products only, named in Ukrainian for the manager.
    const { docs } = await payload.find({
      collection: 'products',
      where: { id: { in: lines.map(({ id }) => id) } },
      locale: 'uk',
      depth: 1,
      limit: lines.length,
      overrideAccess: false,
      select: {
        name: true,
        brand: true,
        price: true,
        volume: true,
        volumeUnit: true,
        availability: true,
        madeToOrderDays: true,
      },
      populate: { brands: { name: true } },
    });
    const priced = priceOrder(
      lines,
      docs.map((product) => ({
        ...product,
        brand: brandName(product.brand) ?? '',
      })),
      total,
    );
    const prepaid = order.payment === 'transfer' || order.payment === 'card';
    if (!priced || (prepaid && !canPrepay(priced.lines)))
      return { status: 'changed' };
    // A signed-in shopper's order is theirs by the session, never by what the form says.
    const customer = await currentCustomer();
    const token = randomBytes(16).toString('base64url');
    const placed = await payload.create({
      collection: 'orders',
      data: {
        ...order,
        ...priced,
        status: 'new',
        paymentStatus: 'awaiting',
        returnToken: token,
        customer: customer?.id,
      },
    });
    after(() =>
      sendTelegram(orderMessage(placed, SITE_URL)).catch((error) =>
        console.error('Telegram:', whatFailed(error)),
      ),
    );
    return { status: 'placed', number: placed.id, token };
  } catch (error) {
    // Only what went wrong: a failed query carries its params, and the database's detail the
    // failing row — the shopper's name, phone and address.
    const { message, cause } = error as {
      message?: string;
      cause?: { message?: string };
    };
    console.error('Order:', cause?.message ?? message?.split('\n')[0]);
    return { status: 'failed' };
  }
}
