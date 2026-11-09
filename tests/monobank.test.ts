import { generateKeyPairSync, sign } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SITE_URL } from '@/lib/constants';

// monobank acquiring (task `mono-payment`): the webhook's signature, the webhook itself and the card's
// invoice. monobank is `fetch`; its key is one made here.

vi.mock('server-only', () => ({}));
vi.mock('@payload-config', () => ({ default: {} }));

const payload = {
  find: vi.fn(),
  update: vi.fn(),
  db: { updateOne: vi.fn() },
};
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
let invoiceNow = 'failure';
const STATUS = '/api/merchant/invoice/status';
const CREATE = '/api/merchant/invoice/create';
const answers = async (url: URL | string) => {
  const { pathname: path, searchParams } = new URL(url);
  if (path === '/api/merchant/pubkey') return Response.json({ key: pubkey });
  if (path === STATUS)
    return Response.json({
      invoiceId: searchParams.get('invoiceId'),
      status: invoiceNow,
      amount: 249100,
    });
  if (path === CREATE)
    return Response.json({
      invoiceId: 'inv-1',
      pageUrl: 'https://pay.mbnk.biz/inv-1',
    });
  return Response.json({ ok: true });
};
// mono's answer to one address.
const monoAnswers = (at: string, answer: () => Response | Promise<Response>) =>
  fetch.mockImplementation(async (url) =>
    new URL(url).pathname === at ? answer() : answers(url),
  );
// The one statement that moves an order: only from what the table allows.
const moved = (invoiceId: string, paymentStatus: string, from: string[]) => ({
  collection: 'orders',
  data: { paymentStatus, updatedAt: expect.any(String) },
  options: { atomic: true },
  where: {
    and: [
      { monoInvoiceId: { equals: invoiceId } },
      { paymentStatus: { in: from } },
    ],
  },
});
const asked = (path: string) =>
  fetch.mock.calls.filter(([url]) => new URL(url).pathname === path);

// A fresh module each test: it keeps mono's key between webhooks.
let monobank: typeof import('@/lib/monobank');
beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal('fetch', fetch);
  vi.stubEnv('MONO_TOKEN', 'test-token');
  pubkey = mono.key;
  invoiceNow = 'failure';
  fetch.mockImplementation(answers);
  payload.db.updateOne.mockResolvedValue(null);
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
    payload.db.updateOne.mockResolvedValue(order);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('pays the order of a paid invoice in one statement and tells the manager', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot');
    vi.stubEnv('TELEGRAM_CHAT_ID', '1');
    const response = await send({ invoiceId: 'inv-1', status: 'success' });

    expect(response.status).toBe(200);
    expect(payload.db.updateOne).toHaveBeenCalledWith(
      moved('inv-1', 'paid', ['awaiting', 'failed']),
    );
    expect(payload.find).not.toHaveBeenCalled();
    await afterTheAnswer();
    const [, telegram] = asked('/botbot/sendMessage')[0];
    expect(JSON.parse(telegram.body).text).toContain(
      'Оплачено карткою: замовлення №17',
    );
  });

  it('marks a refused card failed', async () => {
    await send({ invoiceId: 'inv-1', status: 'failure' });
    expect(payload.db.updateOne).toHaveBeenCalledWith(
      moved('inv-1', 'failed', ['awaiting']),
    );
  });

  it('answers a forged one 401 and writes nothing', async () => {
    const event = { invoiceId: 'inv-1', status: 'success' };
    for (const sign of [signed('{}'), null]) {
      expect((await send(event, sign)).status).toBe(401);
    }
    expect(payload.db.updateOne).not.toHaveBeenCalled();
  });

  it("answers 503 while mono's key cannot be read, so mono sends it again", async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetch.mockRejectedValue(new Error('network down'));
    expect((await send({ invoiceId: 'inv-1', status: 'success' })).status).toBe(
      503,
    );
    expect(payload.db.updateOne).not.toHaveBeenCalled();
  });

  it('answers 400 to a signed body that is no event', async () => {
    for (const body of ['not json', '{}', '{"invoiceId":""}'])
      expect((await send(body, signed(body))).status, body).toBe(400);
    expect(payload.db.updateOne).not.toHaveBeenCalled();
  });

  it('answers 200 and tells nobody when the statement found nothing to move', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot');
    vi.stubEnv('TELEGRAM_CHAT_ID', '1');
    payload.db.updateOne.mockResolvedValue(null);
    expect((await send({ invoiceId: 'other', status: 'success' })).status).toBe(
      200,
    );
    await afterTheAnswer();
    expect(asked('/botbot/sendMessage')).toHaveLength(0);
  });

  it('answers 200 and writes nothing for a status on its way', async () => {
    expect(
      (await send({ invoiceId: 'inv-1', status: 'processing' })).status,
    ).toBe(200);
    expect(payload.db.updateOne).not.toHaveBeenCalled();
  });
});

describe('settle', () => {
  it('fails an invoice that expired, which mono sends no webhook for', async () => {
    payload.db.updateOne.mockResolvedValue({ id: 17, total: 249100 });
    expect(await monobank.settle(payload as never, 'inv-1', 'expired')).toBe(
      true,
    );
    expect(payload.db.updateOne).toHaveBeenCalledWith(
      moved('inv-1', 'failed', ['awaiting']),
    );
  });

  // A webhook, a return and the cron saying the same thing: only the one that moved it tells.
  it('tells Telegram once when two ways say the same thing', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot');
    vi.stubEnv('TELEGRAM_CHAT_ID', '1');
    payload.db.updateOne
      .mockResolvedValueOnce({ id: 17, total: 249100 })
      .mockResolvedValueOnce(null);
    const results = await Promise.all([
      monobank.settle(payload as never, 'inv-1', 'success'),
      monobank.settle(payload as never, 'inv-1', 'success'),
    ]);
    expect(results.sort()).toEqual([false, true]);
    await afterTheAnswer();
    expect(asked('/botbot/sendMessage')).toHaveLength(1);
  });
});

describe('invoiceStatus', () => {
  it("asks mono with the store's token and reads its answer", async () => {
    expect(await monobank.invoiceStatus('inv 1')).toMatchObject({
      invoiceId: 'inv 1',
      status: 'failure',
    });
    const [[url, init]] = asked(STATUS);
    expect(new URL(url).searchParams.get('invoiceId')).toBe('inv 1');
    expect(init.headers['X-Token']).toBe('test-token');
  });

  it('throws on an answer of another shape', async () => {
    monoAnswers(STATUS, () => Response.json({ status: 'success' }));
    await expect(monobank.invoiceStatus('inv-1')).rejects.toThrow();
  });
});

describe("monobank's reconciliation", () => {
  const SECRET = 'cron-secret-0123456789';
  const NOW = new Date('2026-11-09T03:00:00.000Z');
  const run = (authorization?: string) =>
    monobank.monoReconcile.handler({
      headers: new Headers(authorization ? { authorization } : {}),
      payload,
    } as never);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    vi.stubEnv('CRON_SECRET', SECRET);
    payload.find.mockResolvedValue({
      docs: [
        { id: 1, monoInvoiceId: 'inv-1' },
        { id: 2, monoInvoiceId: 'inv-2' },
      ],
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('answers 401 and reads nothing without the right secret', async () => {
    for (const header of [undefined, `Bearer ${SECRET}x`, SECRET, 'Basic abc'])
      expect((await run(header)).status, String(header)).toBe(401);
    expect(payload.find).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('answers 401 while the server has no secret, even to an empty one', async () => {
    vi.stubEnv('CRON_SECRET', '');
    for (const header of [undefined, 'Bearer ', 'Bearer undefined'])
      expect((await run(header)).status, String(header)).toBe(401);
    expect(payload.find).not.toHaveBeenCalled();
  });

  it('asks mono of the 20 oldest card invoices older than 10 minutes, and moves what it says', async () => {
    invoiceNow = 'expired';
    payload.db.updateOne
      .mockResolvedValueOnce({ id: 1, total: 100 })
      .mockResolvedValueOnce(null);
    const response = await run(`Bearer ${SECRET}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ checked: 2, moved: 1 });
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'orders',
        where: {
          and: [
            { payment: { equals: 'card' } },
            { paymentStatus: { equals: 'awaiting' } },
            { monoInvoiceId: { exists: true } },
            { createdAt: { less_than: '2026-11-09T02:50:00.000Z' } },
          ],
        },
        sort: 'createdAt',
        limit: 20,
        overrideAccess: true,
        select: { monoInvoiceId: true },
      }),
    );
    expect(payload.db.updateOne).toHaveBeenCalledWith(
      moved('inv-2', 'failed', ['awaiting']),
    );
  });

  it('goes on past an invoice mono cannot answer for, and logs no more than what failed', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetch.mockImplementation(async (url) =>
      new URL(url).searchParams.get('invoiceId') === 'inv-1'
        ? new Response('', { status: 500 })
        : answers(url),
    );
    payload.db.updateOne.mockResolvedValue({ id: 2, total: 100 });
    const response = await run(`Bearer ${SECRET}`);

    expect(await response.json()).toEqual({ checked: 2, moved: 1 });
    expect(error).toHaveBeenCalledWith('monobank:', 'HTTP 500');
  });
});

describe('checkCard', () => {
  const token = 'a'.repeat(22);
  let checkCard: typeof import('@/lib/actions/payment.actions').checkCard;
  let getReturnedOrder: typeof import('@/lib/actions/payment.actions').getReturnedOrder;
  const waiting = {
    id: 17,
    total: 249100,
    payment: 'card',
    status: 'new',
    paymentStatus: 'awaiting',
    monoInvoiceId: 'inv-1',
  };

  beforeEach(async () => {
    ({ checkCard, getReturnedOrder } =
      await import('@/lib/actions/payment.actions'));
    payload.find.mockResolvedValue({ docs: [{ monoInvoiceId: 'inv-1' }] });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  // The webhook lands while mono is asked: this statement finds nothing, and the page still says paid.
  it('reads the order again after asking mono, whoever moved it', async () => {
    invoiceNow = 'success';
    payload.db.updateOne.mockResolvedValue(null);
    payload.find
      .mockResolvedValueOnce({ docs: [waiting] })
      .mockResolvedValueOnce({ docs: [{ monoInvoiceId: 'inv-1' }] })
      .mockResolvedValueOnce({ docs: [{ ...waiting, paymentStatus: 'paid' }] });
    expect(await getReturnedOrder(token)).toMatchObject({
      paymentStatus: 'paid',
    });
  });

  it('asks mono nothing on the way back when the card does not wait', async () => {
    for (const other of [
      { paymentStatus: 'paid' },
      { status: 'cancelled' },
      { monoInvoiceId: null },
      { payment: 'transfer' },
    ]) {
      payload.find.mockResolvedValueOnce({ docs: [{ ...waiting, ...other }] });
      await getReturnedOrder(token);
    }
    expect(payload.find).toHaveBeenCalledTimes(4);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('moves a card still waiting by what mono says, as the webhook would', async () => {
    invoiceNow = 'success';
    payload.db.updateOne.mockResolvedValue({ id: 17, total: 249100 });
    await checkCard(token);
    expect(payload.db.updateOne).toHaveBeenCalledWith(
      moved('inv-1', 'paid', ['awaiting', 'failed']),
    );
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          and: [
            { returnToken: { equals: token } },
            { payment: { equals: 'card' } },
            { paymentStatus: { equals: 'awaiting' } },
            { status: { not_equals: 'cancelled' } },
            { monoInvoiceId: { exists: true } },
          ],
        },
        overrideAccess: true,
        select: { monoInvoiceId: true },
      }),
    );
  });

  it('asks mono nothing for an order that does not wait', async () => {
    payload.find.mockResolvedValue({ docs: [] });
    await checkCard(token);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('changes nothing and throws nothing while mono is silent', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetch.mockRejectedValue(new Error('timed out'));
    await expect(checkCard(token)).resolves.toBeUndefined();
    expect(payload.db.updateOne).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('monobank:', 'timed out');
  });
});

describe('payByCard', () => {
  const token = 'a'.repeat(22);
  const placed = {
    id: 17,
    total: 249100,
    lines: [{ product: 1, name: 'Крем', price: 124550, quantity: 2 }],
    payment: 'card',
    status: 'new',
    paymentStatus: 'awaiting',
    monoInvoiceId: null,
    locale: 'en',
  };
  const failed = {
    ...placed,
    paymentStatus: 'failed',
    monoInvoiceId: 'inv-0',
  };
  // The statement that keeps a new invoice: only on the order as it was read.
  const kept = (paymentStatus: string, invoice: object) => ({
    collection: 'orders',
    data: {
      monoInvoiceId: 'inv-1',
      paymentStatus: 'awaiting',
      updatedAt: expect.any(String),
    },
    options: { atomic: true },
    where: {
      and: [
        { id: { equals: 17 } },
        { status: { in: ['new', 'confirmed'] } },
        { paymentStatus: { equals: paymentStatus } },
        { monoInvoiceId: invoice },
      ],
    },
  });
  let payByCard: typeof import('@/lib/actions/card.actions').payByCard;

  beforeEach(async () => {
    ({ payByCard } = await import('@/lib/actions/card.actions'));
    payload.find.mockResolvedValue({ docs: [placed] });
    payload.db.updateOne.mockResolvedValue({ id: 17 });
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
    expect(payload.db.updateOne).toHaveBeenCalledWith(
      kept('awaiting', { exists: false }),
    );
    expect(asked(STATUS)).toHaveLength(0);
  });

  it('sends a Ukrainian order back without a prefix', async () => {
    payload.find.mockResolvedValueOnce({ docs: [{ ...placed, locale: 'uk' }] });
    await payByCard(token, 'olena@example.com');
    const [[, request]] = asked('/api/merchant/invoice/create');
    expect(JSON.parse(request.body).redirectUrl).toBe(
      new URL(`/cart/thanks?t=${token}`, SITE_URL).href,
    );
  });

  it('makes no invoice for an order not by card, paid, gone on, already invoiced or unknown', async () => {
    for (const docs of [
      [{ ...placed, payment: 'transfer' }],
      [{ ...placed, paymentStatus: 'paid' }],
      [{ ...failed, paymentStatus: 'refunded' }],
      [{ ...failed, status: 'shipped' }],
      [{ ...failed, status: 'completed' }],
      [{ ...failed, status: 'cancelled' }],
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

  const logged = async (answer: Response) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetch.mockImplementation(async (url) =>
      new URL(url).pathname === '/api/merchant/invoice/create'
        ? answer
        : answers(url),
    );
    await payByCard(token, 'olena@example.com');
    return error;
  };

  it.each([
    ["invalid 'qty'", "HTTP 400 BAD_REQUEST invalid 'qty'"],
    ['bad address olena@example.com', 'HTTP 400 BAD_REQUEST'],
  ])('logs what mono refused, and no address: %s', async (errText, line) => {
    const error = await logged(
      Response.json({ errCode: 'BAD_REQUEST', errText }, { status: 400 }),
    );
    expect(error).toHaveBeenCalledWith('monobank:', line);
    expect(JSON.stringify(error.mock.calls)).not.toContain('olena');
  });

  it('logs which fields of mono’s answer did not hold', async () => {
    const error = await logged(Response.json({ invoiceId: 'a' }));
    expect(error).toHaveBeenCalledWith('monobank:', 'invalid: pageUrl');
  });

  it('turns it to a link while no token is set, asking mono nothing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('MONO_TOKEN', '');
    expect(await payByCard(token, 'olena@example.com')).toEqual({
      status: 'link',
    });
    expect(asked('/api/merchant/invoice/create')).toHaveLength(0);
  });

  describe('another try', () => {
    beforeEach(() => payload.find.mockResolvedValue({ docs: [failed] }));

    it.each(['failure', 'expired'])(
      'makes a new invoice once mono says %s of the old one, for the database’s sum',
      async (status) => {
        invoiceNow = status;
        expect(await payByCard(token, 'olena@example.com')).toEqual({
          status: 'pay',
          url: 'https://pay.mbnk.biz/inv-1',
        });
        expect(new URL(asked(STATUS)[0][0]).searchParams.get('invoiceId')).toBe(
          'inv-0',
        );
        expect(JSON.parse(asked(CREATE)[0][1].body).amount).toBe(249100);
        expect(payload.db.updateOne).toHaveBeenCalledWith(
          kept('failed', { equals: 'inv-0' }),
        );
      },
    );

    it('makes none when the old invoice was paid after all, and the order is paid', async () => {
      invoiceNow = 'success';
      expect(await payByCard(token, 'olena@example.com')).toEqual({
        status: 'none',
      });
      expect(payload.db.updateOne).toHaveBeenCalledWith(
        moved('inv-0', 'paid', ['awaiting', 'failed']),
      );
      expect(asked(CREATE)).toHaveLength(0);
    });

    it.each(['created', 'processing', 'hold'])(
      'makes none while the old invoice is still %s',
      async (status) => {
        invoiceNow = status;
        expect(await payByCard(token, 'olena@example.com')).toEqual({
          status: 'none',
        });
        expect(asked(CREATE)).toHaveLength(0);
      },
    );

    it('makes none while mono cannot say what became of the old one', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      monoAnswers(STATUS, () => new Response('', { status: 500 }));
      expect(await payByCard(token, 'olena@example.com')).toEqual({
        status: 'none',
      });
      expect(asked(CREATE)).toHaveLength(0);
      expect(payload.update).not.toHaveBeenCalled();
    });

    it('stays failed, with no link and no message, when mono makes no new invoice', async () => {
      vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot');
      vi.stubEnv('TELEGRAM_CHAT_ID', '1');
      vi.spyOn(console, 'error').mockImplementation(() => {});
      monoAnswers(CREATE, () => new Response('', { status: 500 }));
      // Already failed: mono's `failure` finds nothing to move.
      payload.db.updateOne.mockResolvedValue(null);
      expect(await payByCard(token, 'olena@example.com')).toEqual({
        status: 'none',
      });
      expect(payload.update).not.toHaveBeenCalled();
      expect(payload.db.updateOne).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ monoInvoiceId: expect.anything() }),
        }),
      );
      await afterTheAnswer();
      expect(asked('/botbot/sendMessage')).toHaveLength(0);
    });

    it('gives no page to pay on to the tab that came second', async () => {
      payload.db.updateOne.mockResolvedValue(null);
      expect(await payByCard(token, 'olena@example.com')).toEqual({
        status: 'none',
      });
    });
  });

  // F4 of `mono-payment`: mono made the invoice, so nothing about it failed to be made.
  it('gives no page to pay on, and no link, when the invoice could not be kept', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot');
    vi.stubEnv('TELEGRAM_CHAT_ID', '1');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    payload.db.updateOne.mockRejectedValue(new Error('database down'));
    expect(await payByCard(token, 'olena@example.com')).toEqual({
      status: 'none',
    });
    expect(payload.update).not.toHaveBeenCalled();
    await afterTheAnswer();
    expect(asked('/botbot/sendMessage')).toHaveLength(0);
  });
});
