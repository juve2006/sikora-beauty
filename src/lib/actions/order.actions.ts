'use server';

import config from '@payload-config';
import { getPayload } from 'payload';

import type { OrderState } from '@/types';
import { priceOrder } from '@/lib/orders';
import { brandName } from '@/lib/product-page';
import { verifyTurnstile } from '@/lib/turnstile';
import { parseOrderForm } from '@/lib/validators';

// The one way an order is created (the collection's `create` is closed to everyone): the form's
// fields, then Turnstile, then the database's prices — never the browser's (RULES.md) — then the
// record, with the Local API's access skipped, as only this action writes. Nobody is told yet: the
// manager finds a new order in the admin until Telegram is set up for every request at once.
export async function placeOrder(
  _: OrderState,
  form: FormData,
): Promise<OrderState> {
  const parsed = parseOrderForm(form);
  if (!parsed.data)
    return Object.keys(parsed.errors).length > 0
      ? { status: 'invalid', errors: parsed.errors }
      : { status: 'failed' };
  const { token, lines, total, ...order } = parsed.data;
  if (!(await verifyTurnstile(token))) return { status: 'failed' };

  try {
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
    if (!priced) return { status: 'changed' };
    const { id } = await payload.create({
      collection: 'orders',
      data: { ...order, ...priced, status: 'new' },
    });
    return { status: 'placed', number: id };
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
