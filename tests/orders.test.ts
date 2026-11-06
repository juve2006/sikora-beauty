import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Order } from '@/payload-types';
import { keepStatusForward } from '@/collections/orders';
import { placeOrder } from '@/lib/actions/order.actions';
import { ORDER_STATUSES, TELEGRAM_TEXT_LIMIT } from '@/lib/constants';
import { canMoveStatus, priceOrder } from '@/lib/orders';
import { orderMessage } from '@/lib/telegram';
import { parseOrderForm } from '@/lib/validators';

vi.mock('server-only', () => ({}));
vi.mock('@payload-config', () => ({ default: {} }));

// The action's Payload.
const payload = { auth: vi.fn(), find: vi.fn(), create: vi.fn() };
vi.mock('payload', async (original) => ({
  ...(await original<typeof import('payload')>()),
  getPayload: async () => payload,
}));
// The work it leaves for after the answer, kept until a test says the answer has gone.
const later: (() => Promise<unknown>)[] = [];
vi.mock('next/server', async (original) => ({
  ...(await original<typeof import('next/server')>()),
  after: (task: () => Promise<unknown>) => later.push(task),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
const afterTheAnswer = () => Promise.all(later.splice(0).map((task) => task()));

const cream = {
  id: 1,
  name: 'Крем',
  brand: 'Dr.Spiller',
  price: 124550,
  volume: 50,
  volumeUnit: 'ml' as const,
  availability: 'in_stock' as const,
  madeToOrderDays: null,
};
const serum = {
  ...cream,
  id: 2,
  name: 'Сироватка',
  price: 89900,
  volume: null,
  volumeUnit: null,
  availability: 'made_to_order' as const,
  madeToOrderDays: 7,
};

// RULES.md: the server reprices every order; an order keeps a snapshot of names and prices.
describe('priceOrder', () => {
  it('prices the lines from the database and keeps them as they are', () => {
    const lines = [
      { id: 1, qty: 2 },
      { id: 2, qty: 1 },
    ];
    expect(priceOrder(lines, [serum, cream], 339_000)).toEqual({
      total: 339_000,
      lines: [
        {
          product: 1,
          name: 'Крем',
          brand: 'Dr.Spiller',
          volume: '50 мл',
          price: 124550,
          quantity: 2,
          availability: 'in_stock',
          madeToOrderDays: undefined,
        },
        {
          product: 2,
          name: 'Сироватка',
          brand: 'Dr.Spiller',
          volume: undefined,
          price: 89900,
          quantity: 1,
          availability: 'made_to_order',
          madeToOrderDays: 7,
        },
      ],
    });
  });

  it('orders nothing when the sum is not the one the shopper was shown', () => {
    // The browser showed yesterday's price, or a forged one.
    expect(priceOrder([{ id: 1, qty: 1 }], [cream], 100)).toBeNull();
    expect(priceOrder([{ id: 1, qty: 1 }], [cream], 124551)).toBeNull();
  });

  it('orders nothing when a product is gone or out of stock', () => {
    expect(priceOrder([{ id: 3, qty: 1 }], [cream], 0)).toBeNull();
    expect(
      priceOrder(
        [{ id: 1, qty: 1 }],
        [{ ...cream, availability: 'out_of_stock' }],
        124550,
      ),
    ).toBeNull();
  });
});

// RULES.md: an order's status only moves forward.
describe('canMoveStatus', () => {
  it('moves forward, step by step or past one', () => {
    expect(canMoveStatus('new', 'confirmed')).toBe(true);
    expect(canMoveStatus('new', 'shipped')).toBe(true);
    expect(canMoveStatus('shipped', 'completed')).toBe(true);
  });

  it('never moves back', () => {
    expect(canMoveStatus('confirmed', 'new')).toBe(false);
    expect(canMoveStatus('completed', 'shipped')).toBe(false);
  });

  it('cancels an order until it is completed, and nothing leaves a cancelled one', () => {
    for (const from of ['new', 'confirmed', 'shipped'] as const)
      expect(canMoveStatus(from, 'cancelled')).toBe(true);
    expect(canMoveStatus('completed', 'cancelled')).toBe(false);
    for (const to of ORDER_STATUSES.filter((s) => s !== 'cancelled'))
      expect(canMoveStatus('cancelled', to)).toBe(false);
  });

  it('takes saving the same status for no move', () => {
    for (const status of ORDER_STATUSES)
      expect(canMoveStatus(status, status)).toBe(true);
  });
});

describe('keepStatusForward', () => {
  const save = (status: string, from: string, operation = 'update') =>
    keepStatusForward({
      data: { status },
      originalDoc: { status: from },
      operation,
      req: { t: (key: string) => key },
    } as never);

  it('lets a forward step through and refuses a step back', () => {
    expect(save('confirmed', 'new')).toEqual({ status: 'confirmed' });
    expect(() => save('new', 'confirmed')).toThrow();
  });

  it('leaves a new order alone', () => {
    expect(save('new', 'completed', 'create')).toEqual({ status: 'new' });
  });
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
  return data;
};
const BROVARY = 'e715719e-4b33-11e4-ab6d-005056801329';
const BRANCH = '47402eb3-e1c2-11e3-8c4a-0050568002cf';
const filled = {
  firstName: ' Олена ',
  lastName: 'Коваль',
  phone: '067 123-45-67',
  settlement: 'м. Бровари, Броварський р-н, Київська обл.',
  warehouse: 'Відділення №2: вул. Київська, 302',
  settlementRef: BROVARY,
  warehouseRef: BRANCH,
  payment: 'cod',
  comment: '',
  lines: JSON.stringify([
    { id: 1, qty: 2 },
    { id: 2, qty: 1 },
  ]),
  total: '339000',
  locale: 'en',
  'cf-turnstile-response': 'token',
};
const idle = { status: 'idle' } as const;

describe('the order schema', () => {
  it("reads a filled form, with the shopper's phone as +380…", () => {
    expect(parseOrderForm(form(filled)).data).toEqual({
      firstName: 'Олена',
      lastName: 'Коваль',
      phone: '+380671234567',
      settlement: filled.settlement,
      warehouse: filled.warehouse,
      settlementRef: BROVARY,
      warehouseRef: BRANCH,
      payment: 'cod',
      comment: undefined,
      lines: [
        { id: 1, qty: 2 },
        { id: 2, qty: 1 },
      ],
      total: 339000,
      locale: 'en',
      token: 'token',
    });
  });

  it("takes an address typed by hand, without Nova Poshta's refs", () => {
    const data = parseOrderForm(
      form({ ...filled, settlementRef: '', warehouseRef: '' }),
    ).data;
    expect(data?.settlementRef).toBeUndefined();
    expect(data?.warehouseRef).toBeUndefined();
  });

  it('names what is wrong with the typed fields by their message keys', () => {
    expect(
      parseOrderForm(
        form({
          ...filled,
          firstName: ' ',
          lastName: 'x'.repeat(51),
          phone: '123',
          warehouse: '',
          payment: 'card',
          comment: 'x'.repeat(501),
        }),
      ).errors,
    ).toEqual({
      firstName: ['required'],
      lastName: ['long'],
      phone: ['phoneInvalid'],
      warehouse: ['required'],
      payment: ['paymentRequired'],
      comment: ['long'],
    });
  });

  it.each([
    ['lines', 'not json'],
    ['lines', '[]'],
    ['lines', JSON.stringify([{ id: 1, qty: 11 }])],
    [
      'lines',
      JSON.stringify([
        { id: 1, qty: 1 },
        { id: 1, qty: 2 },
      ]),
    ],
    ['total', '-1'],
    ['total', '12.5'],
    ['settlementRef', 'not-a-ref'],
  ])('shows no field for a broken hidden %s', (name, value) => {
    expect(parseOrderForm(form({ ...filled, [name]: value })).errors).toEqual(
      {},
    );
  });
});

describe('the Telegram message', () => {
  const site = new URL('https://shop.example');
  const order: Order = {
    id: 17,
    total: 339000,
    firstName: 'Олена <b>',
    lastName: 'Коваль',
    phone: '+380671234567',
    settlement: 'Бровари',
    warehouse: 'Відділення №1',
    settlementRef: 'settlement-ref',
    warehouseRef: 'warehouse-ref',
    payment: 'cod',
    comment: 'Після 18:00',
    locale: 'uk',
    status: 'new',
    updatedAt: '',
    createdAt: '',
    lines: [
      {
        name: 'Крем',
        brand: 'Dr.Spiller',
        volume: '50 мл',
        price: 124550,
        quantity: 2,
        availability: 'in_stock',
      },
      {
        name: 'Сироватка',
        brand: 'Dr.Spiller',
        price: 89900,
        quantity: 1,
        availability: 'made_to_order',
        madeToOrderDays: 7,
      },
    ],
  };

  it('carries the order and a link to it in the admin, as plain text', () => {
    expect(orderMessage(order, site)).toBe(
      [
        'Нове замовлення №17 — 3390 грн',
        "Ім'я: Олена <b> Коваль",
        'Телефон: +380671234567',
        'Доставка: Бровари, Відділення №1',
        'Оплата: післяплата',
        'Коментар: Після 18:00',
        'Товари:',
        '- Крем, Dr.Spiller, 50 мл × 2 — 2491 грн',
        '- Сироватка, Dr.Spiller × 1 — 899 грн (під замовлення, 7 дн.)',
        'https://shop.example/admin/collections/orders/17',
      ].join('\n'),
    );
  });

  it('leaves out what the order does not have', () => {
    const lines = orderMessage(
      { ...order, comment: null, lines: [order.lines[0]] },
      site,
    ).split('\n');
    expect(lines).toHaveLength(8);
    expect(lines.join('\n')).not.toContain('Коментар');
  });

  it('says when the address was typed by hand, a shopper’s language and the kopiyky', () => {
    const message = orderMessage(
      {
        ...order,
        total: 124550,
        settlementRef: null,
        locale: 'en',
        payment: 'link',
        lines: [
          { ...order.lines[0], quantity: 1 },
          { ...order.lines[1], madeToOrderDays: null },
        ],
      },
      site,
    );
    expect(message).toContain('— 1245,50 грн\n');
    expect(message).toContain(
      'Доставка: Бровари, Відділення №1 (введено вручну, перевірити)',
    );
    expect(message).toContain('Оплата: посилання на оплату');
    expect(message).toContain('Мова: англійська');
    expect(message).toContain('× 1 — 1245,50 грн\n');
    expect(message).toContain('× 1 — 899 грн (під замовлення)\n');
  });

  it('cuts a long order to what Telegram takes, and keeps the contacts and the link', () => {
    const long = { ...order.lines[0], name: 'Я'.repeat(200) };
    const message = orderMessage(
      { ...order, lines: Array.from({ length: 50 }, () => long) },
      site,
    );
    expect(message).toHaveLength(TELEGRAM_TEXT_LIMIT);
    expect(message).toContain('Телефон: +380671234567');
    expect(message).toContain(
      '…\nhttps://shop.example/admin/collections/orders/17',
    );
  });
});

describe('placeOrder', () => {
  const fetch = vi.fn();
  const products = [
    { ...cream, brand: { id: 5, name: 'Dr.Spiller' } },
    { ...serum, brand: { id: 5, name: 'Dr.Spiller' } },
  ];

  beforeEach(() => {
    vi.stubGlobal('fetch', fetch);
    payload.auth.mockResolvedValue({ user: null });
    payload.find.mockResolvedValue({ docs: products });
    payload.create.mockImplementation(async ({ data }) => ({
      id: 17,
      ...data,
    }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("places the order at the database's prices, with a snapshot of its lines", async () => {
    expect(await placeOrder(idle, form(filled))).toEqual({
      status: 'placed',
      number: 17,
    });
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'products',
        where: { id: { in: [1, 2] } },
        locale: 'uk',
        overrideAccess: false,
      }),
    );
    expect(payload.create).toHaveBeenCalledWith({
      collection: 'orders',
      data: {
        firstName: 'Олена',
        lastName: 'Коваль',
        phone: '+380671234567',
        settlement: filled.settlement,
        warehouse: filled.warehouse,
        settlementRef: BROVARY,
        warehouseRef: BRANCH,
        payment: 'cod',
        comment: undefined,
        locale: 'en',
        status: 'new',
        total: 339000,
        lines: [
          expect.objectContaining({ product: 1, price: 124550, quantity: 2 }),
          expect.objectContaining({ product: 2, price: 89900, quantity: 1 }),
        ],
      },
    });
    // Without the bot's token and the group's id nothing is sent.
    await afterTheAnswer();
    expect(fetch).not.toHaveBeenCalled();
  });

  describe('with the Telegram group set up', () => {
    const answer = (body: object) => ({ status: 200, json: async () => body });

    beforeEach(() => {
      vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot-token');
      vi.stubEnv('TELEGRAM_CHAT_ID', '-100123');
    });

    it('tells the group once, after the answer, what was saved', async () => {
      fetch.mockResolvedValueOnce(answer({ ok: true }));
      await placeOrder(idle, form(filled));
      expect(fetch).not.toHaveBeenCalled();
      await afterTheAnswer();
      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = fetch.mock.calls[0];
      expect(url).toBe('https://api.telegram.org/botbot-token/sendMessage');
      const body = JSON.parse(init.body);
      expect(body).toMatchObject({
        chat_id: '-100123',
        text: expect.stringContaining(
          "Нове замовлення №17 — 3390 грн\nІм'я: Олена Коваль\nТелефон: +380671234567",
        ),
      });
      // Plain text: a shopper's `<b>` would make Telegram refuse a message with markup.
      expect(body).not.toHaveProperty('parse_mode');
    });

    it('answers «placed» when Telegram fails, and logs only what it said', async () => {
      fetch.mockResolvedValueOnce(
        answer({ ok: false, description: 'chat not found' }),
      );
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(await placeOrder(idle, form(filled))).toEqual({
        status: 'placed',
        number: 17,
      });
      await afterTheAnswer();
      expect(error.mock.calls).toEqual([
        ['Telegram:', 'Telegram: chat not found'],
      ]);
    });

    it('answers «placed» when Telegram does not answer', async () => {
      fetch.mockRejectedValueOnce(new Error('fetch failed'));
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(await placeOrder(idle, form(filled))).toEqual({
        status: 'placed',
        number: 17,
      });
      await afterTheAnswer();
      expect(error.mock.calls).toEqual([['Telegram:', 'fetch failed']]);
    });

    it('tells the group nothing about an order that was not saved', async () => {
      payload.create.mockRejectedValueOnce(new Error('Failed query'));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(await placeOrder(idle, form(filled))).toEqual({
        status: 'failed',
      });
      await afterTheAnswer();
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  // AC-6 of the task `customer-accounts`.
  it("leaves a guest's order with nobody", async () => {
    payload.auth.mockResolvedValue({ user: null });
    await placeOrder(idle, form(filled));
    expect(payload.create.mock.calls.at(-1)?.[0].data.customer).toBeUndefined();
  });

  it("makes a signed-in shopper's order theirs, by the session alone", async () => {
    payload.auth.mockResolvedValue({
      user: { id: 5, collection: 'customers' },
    });
    await placeOrder(idle, form({ ...filled, customer: '9' }));
    expect(payload.create.mock.calls.at(-1)?.[0].data.customer).toBe(5);
  });

  it('makes no order of staff a shopper’s', async () => {
    payload.auth.mockResolvedValue({
      user: { id: 5, collection: 'users', role: 'owner' },
    });
    await placeOrder(idle, form(filled));
    expect(payload.create.mock.calls.at(-1)?.[0].data.customer).toBeUndefined();
  });

  it('orders nothing when the shopper was shown another sum', async () => {
    expect(await placeOrder(idle, form({ ...filled, total: '1' }))).toEqual({
      status: 'changed',
    });
    expect(payload.create).not.toHaveBeenCalled();
  });

  it('orders nothing when a product is no longer published', async () => {
    payload.find.mockResolvedValueOnce({ docs: [products[0]] });
    expect(await placeOrder(idle, form(filled))).toEqual({
      status: 'changed',
    });
    expect(payload.create).not.toHaveBeenCalled();
  });

  it('orders nothing when a field is wrong or a hidden one is broken', async () => {
    expect(await placeOrder(idle, form({ ...filled, phone: '1' }))).toEqual({
      status: 'invalid',
      errors: { phone: ['phoneInvalid'] },
    });
    expect(await placeOrder(idle, form({ ...filled, lines: '[]' }))).toEqual({
      status: 'failed',
    });
    expect(payload.find).not.toHaveBeenCalled();
  });

  it('orders nothing when Turnstile refuses the token', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
    fetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ success: false }),
    });
    expect(await placeOrder(idle, form(filled))).toEqual({ status: 'failed' });
    expect(payload.find).not.toHaveBeenCalled();
  });

  // RULES.md: a shopper's personal data never reaches a log.
  it("logs what failed without the shopper's data", async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    payload.create.mockRejectedValueOnce(
      Object.assign(
        new Error(
          'Failed query: insert into "orders" params: Олена,Коваль,+380671234567\nmore',
        ),
        {
          cause: { message: 'duplicate key value violates unique constraint' },
        },
      ),
    );
    expect(await placeOrder(idle, form(filled))).toEqual({ status: 'failed' });
    expect(error).toHaveBeenCalledWith(
      'Order:',
      'duplicate key value violates unique constraint',
    );
    const logged = JSON.stringify(error.mock.calls);
    for (const data of ['Олена', 'Коваль', '+380671234567', 'Бровари'])
      expect(logged).not.toContain(data);
  });
});
