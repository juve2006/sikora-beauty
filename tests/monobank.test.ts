import { generateKeyPairSync, sign } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SITE_URL } from '@/lib/constants';

// monobank acquiring (task `mono-payment`): the webhook's signature, the webhook itself and the card's
// invoice. monobank is `fetch`; its key is one made here.

vi.mock('server-only', () => ({}));
vi.mock('@payload-config', () => ({ default: {} }));

const payload = { find: vi.fn(), update: vi.fn() };
vi.mock('payload', async (original) => ({
  ...(await original<typeof import('payload')>()),
  getPayload: async () => payload,
}));
const later: (() => Promise<unknown>)[] = [];
vi.mock('next/server', async (original) => ({
  ...(await original<typeof import('next/server')>()),
  after: (task: () => Promise<unknown>) => later.push(task),
}));
const afterTheAnswer = () => Promise.all(later.splice(0).map((task) => task()));

const keyPair = () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  const pem = publicKey.export({ type: 'spki', format: 'pem' });
  return { privateKey, key: Buffer.from(pem).toString('base64') };
};
const mono = keyPair();
const signed = (body: string, key = mono.privateKey) =>
  sign('sha256', Buffer.from(body), key).toString('base64');

// monobank's key, its invoices and Telegram, by the address asked.
const fetch = vi.fn();
let pubkey = mono.key;
const answers = async (url: URL | string) => {
  const path = new URL(url).pathname;
  if (path === '/api/merchant/pubkey') return Response.json({ key: pubkey });
  if (path === '/api/merchant/invoice/create')
    return Response.json({
      invoiceId: 'inv-1',
      pageUrl: 'https://pay.mbnk.biz/inv-1',
    });
  return Response.json({ ok: true });
};
const asked = (path: string) =>
  fetch.mock.calls.filter(([url]) => new URL(url).pathname === path);

// A fresh module each test: it keeps mono's key between webhooks.
let monobank: typeof import('@/lib/monobank');
beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal('fetch', fetch);
  vi.stubEnv('MONO_TOKEN', 'test-token');
  pubkey = mono.key;
  fetch.mockImplementation(answers);
  monobank = await import('@/lib/monobank');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  later.length = 0;
});

describe('verifyWebhook', () => {
  const body = JSON.stringify({ invoiceId: 'inv-1', status: 'success' });

  it("takes a body signed by mono's key, which it asks for once", async () => {
    expect(await monobank.verifyWebhook(body, signed(body))).toBe(true);
    expect(await monobank.verifyWebhook(body, signed(body))).toBe(true);
    expect(asked('/api/merchant/pubkey')).toHaveLength(1);
    expect(asked('/api/merchant/pubkey')[0][1].headers['X-Token']).toBe(
      'test-token',
    );
  });

  it('refuses another key, another body, a broken signature and none', async () => {
    const other = keyPair().privateKey;
    expect(await monobank.verifyWebhook(body, signed(body, other))).toBe(false);
    expect(await monobank.verifyWebhook(`${body} `, signed(body))).toBe(false);
    expect(await monobank.verifyWebhook(body, 'not base64 at all')).toBe(false);
    expect(await monobank.verifyWebhook(body, null)).toBe(false);
  });

  it('asks for the key again when mono changed it, at most once a minute', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    expect(await monobank.verifyWebhook(body, signed(body))).toBe(true);
    const next = keyPair();
    pubkey = next.key;

    expect(
      await monobank.verifyWebhook(body, signed(body, next.privateKey)),
    ).toBe(false);
    expect(asked('/api/merchant/pubkey')).toHaveLength(1);
    vi.advanceTimersByTime(61_000);
    expect(
      await monobank.verifyWebhook(body, signed(body, next.privateKey)),
    ).toBe(true);
    expect(asked('/api/merchant/pubkey')).toHaveLength(2);
  });
});

describe("monobank's webhook", () => {
  const order = { id: 17, total: 249100, paymentStatus: 'awaiting' };
  const send = (
    event: object | string,
    sign: string | null = signed(JSON.stringify(event)),
  ) => {
    const body = typeof event === 'string' ? event : JSON.stringify(event);
    return monobank.monoWebhook.handler({
      text: async () => body,
      headers: new Headers(sign ? { 'x-sign': sign } : {}),
      payload,
    } as never);
  };

  beforeEach(() => {
    payload.find.mockResolvedValue({ docs: [order] });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('pays the order of a paid invoice, as its provider, and tells the manager', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot');
    vi.stubEnv('TELEGRAM_CHAT_ID', '1');
    const response = await send({ invoiceId: 'inv-1', status: 'success' });

    expect(response.status).toBe(200);
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'orders',
        where: { monoInvoiceId: { equals: 'inv-1' } },
      }),
    );
    expect(payload.update).toHaveBeenCalledWith({
      collection: 'orders',
      id: 17,
      data: { paymentStatus: 'paid' },
      context: { paymentProvider: true },
    });
    await afterTheAnswer();
    const [, telegram] = asked('/botbot/sendMessage')[0];
    expect(JSON.parse(telegram.body).text).toContain(
      'Оплачено карткою: замовлення №17',
    );
  });

  it('marks a refused card failed', async () => {
    await send({ invoiceId: 'inv-1', status: 'failure' });
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { paymentStatus: 'failed' } }),
    );
  });

  it('answers a forged one 401 and reads nothing', async () => {
    const event = { invoiceId: 'inv-1', status: 'success' };
    for (const sign of [signed('{}'), null]) {
      expect((await send(event, sign)).status).toBe(401);
    }
    expect(payload.find).not.toHaveBeenCalled();
  });

  it("answers 503 while mono's key cannot be read, so mono sends it again", async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetch.mockRejectedValue(new Error('network down'));
    expect((await send({ invoiceId: 'inv-1', status: 'success' })).status).toBe(
      503,
    );
    expect(payload.find).not.toHaveBeenCalled();
  });

  it('answers 400 to a signed body that is no event', async () => {
    for (const body of ['not json', '{}', '{"invoiceId":""}'])
      expect((await send(body, signed(body))).status, body).toBe(400);
    expect(payload.find).not.toHaveBeenCalled();
  });

  it('answers 200 and writes nothing for an unknown invoice, a repeat or a status on its way', async () => {
    payload.find.mockResolvedValueOnce({ docs: [] });
    expect((await send({ invoiceId: 'other', status: 'success' })).status).toBe(
      200,
    );
    payload.find.mockResolvedValueOnce({
      docs: [{ ...order, paymentStatus: 'paid' }],
    });
    expect((await send({ invoiceId: 'inv-1', status: 'success' })).status).toBe(
      200,
    );
    expect(
      (await send({ invoiceId: 'inv-1', status: 'processing' })).status,
    ).toBe(200);
    expect(payload.update).not.toHaveBeenCalled();
  });
});

describe('payByCard', () => {
  const token = 'a'.repeat(22);
  const placed = {
    id: 17,
    total: 249100,
    lines: [{ product: 1, name: 'Крем', price: 124550, quantity: 2 }],
    payment: 'card',
    paymentStatus: 'awaiting',
    monoInvoiceId: null,
    locale: 'en',
  };
  let payByCard: typeof import('@/lib/actions/card.actions').payByCard;

  beforeEach(async () => {
    ({ payByCard } = await import('@/lib/actions/card.actions'));
    payload.find.mockResolvedValue({ docs: [placed] });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it("makes mono's invoice for the database's sum and keeps it", async () => {
    expect(await payByCard(token, 'Olena@Example.com')).toEqual({
      status: 'pay',
      url: 'https://pay.mbnk.biz/inv-1',
    });
    const [[, request]] = asked('/api/merchant/invoice/create');
    expect(request.headers['X-Token']).toBe('test-token');
    expect(JSON.parse(request.body)).toEqual({
      amount: 249100,
      merchantPaymInfo: {
        reference: '17',
        destination: 'Оплата замовлення №17',
        basketOrder: [
          {
            name: 'Крем',
            qty: 2,
            sum: 124550,
            total: 249100,
            code: '1',
            unit: 'шт',
          },
        ],
        customerEmails: ['olena@example.com'],
      },
      redirectUrl: new URL(`/en/cart/thanks?t=${token}`, SITE_URL).href,
      webHookUrl: new URL('/api/mono/webhook', SITE_URL).href,
    });
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { returnToken: { equals: token } } }),
    );
    expect(payload.update).toHaveBeenCalledWith({
      collection: 'orders',
      id: 17,
      data: { monoInvoiceId: 'inv-1' },
    });
  });

  it('sends a Ukrainian order back without a prefix', async () => {
    payload.find.mockResolvedValueOnce({ docs: [{ ...placed, locale: 'uk' }] });
    await payByCard(token, 'olena@example.com');
    const [[, request]] = asked('/api/merchant/invoice/create');
    expect(JSON.parse(request.body).redirectUrl).toBe(
      new URL(`/cart/thanks?t=${token}`, SITE_URL).href,
    );
  });

  it('makes no invoice for an order not by card, not awaiting, already invoiced or unknown', async () => {
    for (const docs of [
      [{ ...placed, payment: 'transfer' }],
      [{ ...placed, paymentStatus: 'failed' }],
      [{ ...placed, monoInvoiceId: 'inv-0' }],
      [],
    ]) {
      payload.find.mockResolvedValueOnce({ docs });
      expect(await payByCard(token, 'olena@example.com')).toEqual({
        status: 'none',
      });
    }
    expect(await payByCard('short', 'olena@example.com')).toEqual({
      status: 'none',
    });
    expect(await payByCard(token, 'not an address')).toEqual({
      status: 'none',
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(payload.update).not.toHaveBeenCalled();
  });

  it('turns the order to a link and tells the manager when mono makes no invoice', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot');
    vi.stubEnv('TELEGRAM_CHAT_ID', '1');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetch.mockImplementation(async (url) =>
      new URL(url).pathname === '/api/merchant/invoice/create'
        ? new Response('', { status: 500 })
        : answers(url),
    );
    expect(await payByCard(token, 'olena@example.com')).toEqual({
      status: 'link',
    });
    expect(payload.update).toHaveBeenCalledWith({
      collection: 'orders',
      id: 17,
      data: { payment: 'link' },
    });
    expect(error).toHaveBeenCalledWith('monobank:', 'HTTP 500');
    expect(JSON.stringify(error.mock.calls)).not.toContain('olena');
    await afterTheAnswer();
    const [, telegram] = asked('/botbot/sendMessage')[0];
    expect(JSON.parse(telegram.body).text).toContain(
      'Рахунок mono не створився: замовлення №17',
    );
  });

  it('turns it to a link while no token is set, asking mono nothing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('MONO_TOKEN', '');
    expect(await payByCard(token, 'olena@example.com')).toEqual({
      status: 'link',
    });
    expect(asked('/api/merchant/invoice/create')).toHaveLength(0);
  });
});
