import { createHash, timingSafeEqual, verify } from 'node:crypto';
import { after } from 'next/server';
import type { Endpoint, Payload } from 'payload';

import {
  MONO_API,
  RECONCILE_AFTER,
  RECONCILE_LIMIT,
  SITE_URL,
} from '@/lib/constants';
import { monoPayment, movesTo } from '@/lib/orders';
import { whatFailed } from '@/lib/utils';
import {
  monoError,
  monoEvent,
  monoInvoice,
  monoPubkey,
} from '@/lib/validators';

// monobank acquiring for a card paid on the site: its invoice and its signed webhook. Payments depend
// on orders, never the other way (ARCHITECTURE): this module reads and writes orders, and orders only
// know that a payment provider moves a card's payment status. The token is MONO_TOKEN — a test one
// until the seller's account is live; MONO_API_URL points at the e2e tests' stub. Not `server-only`:
// payload.config loads the webhook, and so does `payload migrate`.

export const cardEnabled = () => Boolean(process.env.MONO_TOKEN);

// Whatever fails — the network, the time it is given, an answer of another shape — throws.
async function call(path: string, init: RequestInit = {}, timeout = 10_000) {
  const response = await fetch(
    new URL(path, process.env.MONO_API_URL || MONO_API),
    {
      ...init,
      headers: {
        'X-Token': process.env.MONO_TOKEN ?? '',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(timeout),
    },
  );
  if (!response.ok) {
    // What mono refused, for the log. All it holds of a shopper is the receipt's address, so a text
    // that repeats one stays out.
    const { errCode, errText } =
      monoError.safeParse(await response.json().catch(() => null)).data ?? {};
    throw new Error(
      [`HTTP ${response.status}`, errCode, !errText?.includes('@') && errText]
        .filter(Boolean)
        .join(' '),
    );
  }
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

// What mono itself says of an invoice now, in the body its webhook carries.
export const invoiceStatus = async (invoiceId: string, timeout?: number) =>
  monoEvent.parse(
    await call(
      `/api/merchant/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`,
      {},
      timeout,
    ),
  );

// Moves the order of an invoice by mono's word: `true` when this call moved it. One statement, so a
// webhook, a shopper's return and the cron saying the same thing move it once and tell the manager
// once; a repeat or an old word finds nothing to move. It goes past `keepPaymentForward`, which
// refuses anyone changing a card's payment through Payload, and asks the table of it itself.
export async function settle(
  payload: Payload,
  invoiceId: string,
  status: string,
) {
  const next = monoPayment(status);
  if (!next) return false;
  const order = await payload.db.updateOne({
    collection: 'orders',
    data: { paymentStatus: next, updatedAt: new Date().toISOString() },
    options: { atomic: true },
    where: {
      and: [
        { monoInvoiceId: { equals: invoiceId } },
        { paymentStatus: { in: movesTo(next) } },
      ],
    },
  });
  if (!order) return false;
  if (next === 'paid' || next === 'failed') {
    after(async () => {
      // Loaded here, not at the top: telegram.ts is `server-only`, and payload.config loads this file.
      const { cardMessage, sendTelegram } = await import('@/lib/telegram');
      await sendTelegram(
        cardMessage({ id: order.id, total: order.total }, next, SITE_URL),
      ).catch((error) => console.error('Telegram:', whatFailed(error)));
    });
  }
  return true;
}

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
// holds (RULES.md), then the order of its invoice moves forward only (`settle`). Every signed event
// is answered 200, the ones that change nothing too, or mono sends them again.
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
    await settle(req.payload, event.data.invoiceId, event.data.status);
    return Response.json({ ok: true });
  },
};

// Whether a request carries the cron's secret. Compared as digests, in constant time whatever its
// length; no secret on the server refuses everyone.
const fromCron = (authorization: string | null) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorization) return false;
  const [sent, expected] = [authorization, `Bearer ${secret}`].map((value) =>
    createHash('sha256').update(value).digest(),
  );
  return timingSafeEqual(sent, expected);
};

// The day's sweep for what no webhook told: the oldest card invoices still waiting, each asked of
// mono and moved as its webhook would have. Past the site password (src/proxy.ts), and nothing is
// read before the secret holds. Younger invoices are left to their shoppers; one mono cannot answer
// for is logged and the rest go on. An `expired` invoice has no webhook at all, so this is its way.
export const monoReconcile: Endpoint = {
  path: '/mono/reconcile',
  method: 'get',
  handler: async (req) => {
    if (!fromCron(req.headers.get('authorization')))
      return Response.json({ error: 'secret' }, { status: 401 });

    // No visitor's read: the cron's, once its secret holds, and only the invoices are selected.
    const { docs } = await req.payload.find({
      collection: 'orders',
      where: {
        and: [
          { payment: { equals: 'card' } },
          { paymentStatus: { equals: 'awaiting' } },
          { monoInvoiceId: { exists: true } },
          {
            createdAt: {
              less_than: new Date(Date.now() - RECONCILE_AFTER).toISOString(),
            },
          },
        ],
      },
      sort: 'createdAt',
      depth: 0,
      limit: RECONCILE_LIMIT,
      pagination: false,
      overrideAccess: true,
      select: { monoInvoiceId: true },
    });
    const results = await Promise.allSettled(
      docs.map(async ({ monoInvoiceId }) => {
        const { status } = await invoiceStatus(monoInvoiceId ?? '', 5_000);
        return settle(req.payload, monoInvoiceId ?? '', status);
      }),
    );
    for (const result of results)
      if (result.status === 'rejected')
        console.error('monobank:', whatFailed(result.reason));
    return Response.json({
      checked: docs.length,
      moved: results.filter(
        (result) => result.status === 'fulfilled' && result.value,
      ).length,
    });
  },
};
