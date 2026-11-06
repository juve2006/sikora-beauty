import { verify } from 'node:crypto';
import { after } from 'next/server';
import type { Endpoint } from 'payload';

import { MONO_API, SITE_URL } from '@/lib/constants';
import { nextPayment } from '@/lib/orders';
import { whatFailed } from '@/lib/utils';
import { monoEvent, monoInvoice, monoPubkey } from '@/lib/validators';

// monobank acquiring for a card paid on the site: its invoice and its signed webhook. Payments depend
// on orders, never the other way (ARCHITECTURE): this module reads and writes orders, and orders only
// know that a payment provider moves a card's payment status. The token is MONO_TOKEN — a test one
// until the seller's account is live; MONO_API_URL points at the e2e tests' stub. Not `server-only`:
// payload.config loads the webhook, and so does `payload migrate`.

export const cardEnabled = () => Boolean(process.env.MONO_TOKEN);

// Whatever fails — the network, ten seconds, an answer of another shape — throws.
async function call(path: string, init: RequestInit = {}) {
  const response = await fetch(
    new URL(path, process.env.MONO_API_URL || MONO_API),
    {
      ...init,
      headers: {
        'X-Token': process.env.MONO_TOKEN ?? '',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// An invoice for the sum the database has, its basket for the fiscal receipt, and where mono sends
// the shopper back and the webhook.
export const createInvoice = async (invoice: object) =>
  monoInvoice.parse(
    await call('/api/merchant/invoice/create', {
      method: 'POST',
      body: JSON.stringify(invoice),
    }),
  );

// The key that signs webhooks, kept between them as mono asks, and fetched again when a signature
// does not hold — at most once a minute, so forged webhooks do not send us to mono each time.
let key: { pem: string; at: number } | undefined;

const fetchKey = async () => {
  const answer = monoPubkey.parse(await call('/api/merchant/pubkey'));
  key = { pem: Buffer.from(answer.key, 'base64').toString(), at: Date.now() };
  return key.pem;
};

// ECDSA over the SHA-256 of the raw body, as `x-sign` carries it in base64.
const holds = (body: string, sign: string, pem: string) => {
  try {
    return verify(
      'sha256',
      Buffer.from(body),
      pem,
      Buffer.from(sign, 'base64'),
    );
  } catch {
    return false;
  }
};

export async function verifyWebhook(body: string, sign: string | null) {
  if (!sign) return false;
  if (key && holds(body, sign, key.pem)) return true;
  if (key && Date.now() - key.at < 60_000) return false;
  return holds(body, sign, await fetchKey());
}

// monobank's webhook, past the site password (src/proxy.ts): nothing is read before the signature
// holds (RULES.md), then the order of its invoice moves forward only, as `nextPayment` allows. Every
// signed event is answered 200, the ones that change nothing too, or mono sends them again.
export const monoWebhook: Endpoint = {
  path: '/mono/webhook',
  method: 'post',
  handler: async (req) => {
    const body = (await req.text?.()) ?? '';
    try {
      if (!(await verifyWebhook(body, req.headers.get('x-sign'))))
        return Response.json({ error: 'signature' }, { status: 401 });
    } catch (error) {
      // mono's key could not be read: mono sends the event again later.
      console.error('monobank:', whatFailed(error));
      return Response.json({ error: 'unavailable' }, { status: 503 });
    }
    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {}
    const event = monoEvent.safeParse(data);
    if (!event.data) return Response.json({ error: 'body' }, { status: 400 });

    // No visitor's read: mono's, once signed, and only the sum and the payment are selected.
    const { docs } = await req.payload.find({
      collection: 'orders',
      where: { monoInvoiceId: { equals: event.data.invoiceId } },
      depth: 0,
      limit: 1,
      pagination: false,
      overrideAccess: true,
      select: { total: true, paymentStatus: true },
    });
    const order = docs[0];
    const next = order && nextPayment(order.paymentStatus, event.data.status);
    if (!next) return Response.json({ ok: true });
    await req.payload.update({
      collection: 'orders',
      id: order.id,
      data: { paymentStatus: next },
      context: { paymentProvider: true },
    });
    if (next === 'paid' || next === 'failed') {
      after(async () => {
        // Loaded here, not at the top: telegram.ts is `server-only`, and payload.config loads this file.
        const { cardMessage, sendTelegram } = await import('@/lib/telegram');
        await sendTelegram(cardMessage(order, next, SITE_URL)).catch((error) =>
          console.error('Telegram:', whatFailed(error)),
        );
      });
    }
    return Response.json({ ok: true });
  },
};
