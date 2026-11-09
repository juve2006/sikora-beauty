import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Order } from '@/payload-types';
import {
  keepPaymentForward,
  keepStatusForward,
  keepWaybill,
} from '@/collections/orders';
import { placeOrder } from '@/lib/actions/order.actions';
import { ORDER_STATUSES, TELEGRAM_TEXT_LIMIT } from '@/lib/constants';
import {
  basketOrder,
  canMovePayment,
  canMoveStatus,
  canPrepay,
  cardRetryable,
  monoPayment,
  movesTo,
  priceOrder,
  waybillBlock,
} from '@/lib/orders';
import { cardMessage, orderMessage } from '@/lib/telegram';
import { parseOrderForm } from '@/lib/validators';

vi.mock('server-only', () => ({}));
vi.mock('@payload-config', () => ({ default: {} }));

// The action's Payload.
const payload = {
  auth: vi.fn(),
  find: vi.fn(),
  findGlobal: vi.fn(),
  create: vi.fn(),
};
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

// A transfer is paid ahead: only an order wholly in stock (adr-20261028-two-step-launch).
describe('canPrepay', () => {
  it('takes an order whose every line is in stock', () => {
    expect(canPrepay([cream, cream])).toBe(true);
  });

  it('refuses one with a line made to order', () => {
    expect(canPrepay([cream, serum])).toBe(false);
  });
});

// The button's own conditions (task `np-waybill`); the server and the form read the same one.
describe('waybillBlock', () => {
  const order = {
    status: 'confirmed',
    paymentStatus: 'paid',
    settlementRef: 'settlement',
    warehouseRef: 'branch',
    waybillNumber: null,
    deliveryCode: null,
  } as const;

  it.each([
    ['a confirmed, paid order', {}],
    ['a shipped one', { status: 'shipped' }],
    [
      'one whose waybill was deleted at Nova Poshta',
      { waybillNumber: '20450000000001', deliveryCode: '2' },
    ],
  ] as const)('lets %s through', (_, change) => {
    expect(waybillBlock({ ...order, ...change })).toBeNull();
  });

  it.each([
    ['Накладна вже є', { waybillNumber: '20450000000001', deliveryCode: '1' }],
    ['Накладна вже є', { waybillNumber: '20450000000001', deliveryCode: null }],
    ['Спершу підтвердьте замовлення', { status: 'new' }],
    ['Замовлення вже закрите', { status: 'completed' }],
    ['Замовлення вже закрите', { status: 'cancelled' }],
    [
      'Адресу введено вручну: створіть накладну в кабінеті НП і впишіть номер',
      { settlementRef: null },
    ],
    [
      'Адресу введено вручну: створіть накладну в кабінеті НП і впишіть номер',
      { warehouseRef: null },
    ],
    ['Замовлення ще не оплачене', { paymentStatus: 'awaiting' }],
    ['Замовлення ще не оплачене', { paymentStatus: 'failed' }],
    ['Замовлення ще не оплачене', { paymentStatus: 'refunded' }],
  ] as const)('«%s» for %o', (reason, change) => {
    expect(waybillBlock({ ...order, ...change })).toBe(reason);
  });
});

describe('keepWaybill', () => {
  const run = (data: object, waybillNumber: string | null) =>
    keepWaybill({
      data,
      originalDoc: { waybillNumber },
      operation: 'update',
    } as never);
  const cleared = {
    deliveryCode: null,
    deliveryStatus: null,
    waybillRequestedAt: null,
  };

  it('drops what was known of the old number when a new one is typed', () => {
    expect(run({ waybillNumber: '20450000000002' }, '20450000000001')).toEqual({
      waybillNumber: '20450000000002',
      ...cleared,
    });
    expect(run({ waybillNumber: '20450000000002' }, null)).toEqual({
      waybillNumber: '20450000000002',
      ...cleared,
    });
  });

  it('leaves a save of the same number alone', () => {
    const data = { waybillNumber: '20450000000001', status: 'shipped' };
    expect(run(data, '20450000000001')).toEqual(data);
  });

  // A tab opened before the button made the waybill: without this it would be free to make a second.
  it.each(['', null, undefined])(
    'keeps the number when the field is %o',
    (value) => {
      expect(run({ waybillNumber: value }, '20450000000001')).toEqual({
        waybillNumber: '20450000000001',
      });
    },
  );

  it('stores nothing for a field never filled in', () => {
    expect(run({ waybillNumber: '' }, null)).toEqual({ waybillNumber: null });
  });

  it('touches nothing when an order is created', () => {
    const data = { firstName: 'Олена' };
    expect(keepWaybill({ data, operation: 'create' } as never)).toEqual(data);
  });
});

// RULES.md: whether an order is paid only moves forward.
describe('canMovePayment', () => {
  it('marks an order paid, and never takes the mark back', () => {
    expect(canMovePayment('awaiting', 'paid')).toBe(true);
    expect(canMovePayment('paid', 'awaiting')).toBe(false);
  });

  it('takes saving the same mark for no move', () => {
    expect(canMovePayment('awaiting', 'awaiting')).toBe(true);
    expect(canMovePayment('paid', 'paid')).toBe(true);
  });

  it('lets a failed card be paid or tried again and a paid one refunded, and nothing else', () => {
    for (const [from, to] of [
      ['awaiting', 'failed'],
      ['failed', 'paid'],
      ['failed', 'awaiting'],
      ['paid', 'refunded'],
    ] as const)
      expect(canMovePayment(from, to), `${from} → ${to}`).toBe(true);
    for (const [from, to] of [
      ['paid', 'failed'],
      ['awaiting', 'refunded'],
      ['refunded', 'paid'],
      ['refunded', 'awaiting'],
    ] as const)
      expect(canMovePayment(from, to), `${from} → ${to}`).toBe(false);
  });
});

// What monobank's word on an invoice makes of an order's payment.
describe('monoPayment', () => {
  it('pays, fails and refunds as the invoice did', () => {
    expect(monoPayment('success')).toBe('paid');
    expect(monoPayment('failure')).toBe('failed');
    expect(monoPayment('expired')).toBe('failed');
    expect(monoPayment('reversed')).toBe('refunded');
  });

  it('says nothing of a status on its way or one it does not know', () => {
    for (const status of ['created', 'processing', 'hold', 'new'])
      expect(monoPayment(status), status).toBeUndefined();
  });
});

// Where monobank's word may move a payment from: a repeat and a late event find nothing to move.
describe('movesTo', () => {
  it('pays what waits or failed, so `failure` and `success` end paid in any order', () => {
    expect(movesTo('paid')).toEqual(['awaiting', 'failed']);
  });

  it('fails only what waits, and refunds only what is paid', () => {
    expect(movesTo('failed')).toEqual(['awaiting']);
    expect(movesTo('refunded')).toEqual(['paid']);
  });
});

describe('cardRetryable', () => {
  const card = {
    payment: 'card',
    status: 'new',
    paymentStatus: 'failed',
    monoInvoiceId: 'inv-1',
  } as const;

  it('offers a card that failed, or that never got its invoice', () => {
    expect(cardRetryable(card)).toBe(true);
    expect(cardRetryable({ ...card, status: 'confirmed' })).toBe(true);
    expect(
      cardRetryable({
        ...card,
        paymentStatus: 'awaiting',
        monoInvoiceId: null,
      }),
    ).toBe(true);
  });

  it('offers nothing while its invoice waits, once paid, on an order gone on, or for another payment', () => {
    for (const other of [
      { paymentStatus: 'awaiting' },
      { paymentStatus: 'paid' },
      { paymentStatus: 'refunded' },
      { status: 'shipped' },
      { status: 'completed' },
      { status: 'cancelled' },
      { payment: 'transfer' },
      { payment: 'link' },
    ] as const)
      expect(
        cardRetryable({ ...card, ...other }),
        String(Object.values(other)),
      ).toBe(false);
  });
});

describe('basketOrder', () => {
  it("gives each line its product's code, its quantity and its kopiyky", () => {
    expect(
      basketOrder([
        { product: 1, name: 'Крем', price: 124550, quantity: 2 },
        { product: { id: 2 }, name: 'Тонік', price: 50000, quantity: 1 },
        { product: null, name: 'Сироватка', price: 89900, quantity: 1 },
      ] as never),
    ).toEqual([
      {
        name: 'Крем',
        qty: 2,
        sum: 124550,
        total: 249100,
        code: '1',
        unit: 'шт',
      },
      {
        name: 'Тонік',
        qty: 1,
        sum: 50000,
        total: 50000,
        code: '2',
        unit: 'шт',
      },
      {
        name: 'Сироватка',
        qty: 1,
        sum: 89900,
        total: 89900,
        code: 'Сироватка',
        unit: 'шт',
      },
    ]);
  });
});

describe('keepPaymentForward', () => {
  const save = (paymentStatus: string, from: string, operation = 'update') =>
    keepPaymentForward({
      context: {},
      data: { paymentStatus },
      originalDoc: { paymentStatus: from },
      operation,
      req: { t: (key: string) => key },
    } as never);

  it('lets the mark through and refuses taking it back', () => {
    expect(save('paid', 'awaiting')).toEqual({ paymentStatus: 'paid' });
    expect(() => save('awaiting', 'paid')).toThrow();
  });

  // RULES.md: a mistaken mark is told in the note. Only a card's new invoice waits again.
  it('refuses making a failed payment wait again by hand', () => {
    expect(() => save('awaiting', 'failed')).toThrow();
  });

  it('leaves a new order alone', () => {
    expect(save('awaiting', 'paid', 'create')).toEqual({
      paymentStatus: 'awaiting',
    });
  });

  // RULES.md: only monobank knows whether a card paid.
  it("lets nobody change a card's payment through Payload", () => {
    const card = (paymentStatus: string) =>
      keepPaymentForward({
        context: { paymentProvider: true },
        data: { paymentStatus },
        originalDoc: { payment: 'card', paymentStatus: 'awaiting' },
        operation: 'update',
        req: { t: (key: string) => key },
      } as never);
    expect(() => card('paid')).toThrow();
    expect(() => card('refunded')).toThrow();
    expect(card('awaiting')).toEqual({ paymentStatus: 'awaiting' });
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
  payment: 'link',
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
  // The store starts on prepayment alone, whatever a form sends.
  it('takes no cash on delivery from the checkout', () => {
    expect(parseOrderForm(form({ ...filled, payment: 'cod' })).errors).toEqual({
      payment: ['paymentRequired'],
    });
  });

  it("reads a filled form, with the shopper's phone as +380…", () => {
    expect(parseOrderForm(form(filled)).data).toEqual({
      firstName: 'Олена',
      lastName: 'Коваль',
      phone: '+380671234567',
      settlement: filled.settlement,
      warehouse: filled.warehouse,
      settlementRef: BROVARY,
      warehouseRef: BRANCH,
      payment: 'link',
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
          payment: 'crypto',
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
    paymentStatus: 'awaiting',
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

  it('tells a card paid, failed, or left without its invoice', () => {
    const site = new URL('https://sikora.example');
    const order = { id: 42, total: 249100 };
    expect(cardMessage(order, 'paid', site)).toContain(
      'Оплачено карткою: замовлення №42, 2491 грн',
    );
    expect(cardMessage(order, 'failed', site)).toContain(
      'Оплата карткою не пройшла: замовлення №42, 2491 грн',
    );
    expect(cardMessage(order, 'link', site)).toContain(
      'Рахунок mono не створився: замовлення №42',
    );
    expect(cardMessage(order, 'paid', site)).toContain(
      'https://sikora.example/admin/collections/orders/42',
    );
  });

  it('names a transfer', () => {
    expect(orderMessage({ ...order, payment: 'transfer' }, site)).toContain(
      'Оплата: переказ на рахунок',
    );
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
    const answer = await placeOrder(idle, form(filled));
    expect(answer).toEqual({
      status: 'placed',
      number: 17,
      token: expect.stringMatching(/^[\w-]{22}$/),
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
        payment: 'link',
        comment: undefined,
        locale: 'en',
        status: 'new',
        paymentStatus: 'awaiting',
        returnToken: (answer as { token: string }).token,
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
      expect(await placeOrder(idle, form(filled))).toMatchObject({
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
      expect(await placeOrder(idle, form(filled))).toMatchObject({
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

  it('gives each order a secret of its own', async () => {
    const first = await placeOrder(idle, form(filled));
    const second = await placeOrder(idle, form(filled));
    expect(first).not.toEqual(second);
  });

  describe('a transfer', () => {
    const transfer = {
      ...filled,
      payment: 'transfer',
      lines: JSON.stringify([{ id: 1, qty: 2 }]),
      total: '249100',
    };
    beforeEach(() => {
      payload.findGlobal.mockResolvedValue({
        recipient: 'ФОП Прізвище Імʼя По батькові',
        iban: 'UA213223130000026007233566001',
        code: '1234567890',
      });
    });

    it('is placed when every line is in stock', async () => {
      expect(await placeOrder(idle, form(transfer))).toMatchObject({
        status: 'placed',
      });
      expect(payload.create.mock.calls.at(-1)?.[0].data).toMatchObject({
        payment: 'transfer',
        paymentStatus: 'awaiting',
      });
    });

    it('takes no line made to order: the cart changed under it', async () => {
      expect(
        await placeOrder(idle, form({ ...filled, payment: 'transfer' })),
      ).toEqual({ status: 'changed' });
      expect(payload.create).not.toHaveBeenCalled();
    });

    it('fails while the store has no account filled in', async () => {
      payload.findGlobal.mockResolvedValue({ recipient: 'ФОП', iban: null });
      expect(await placeOrder(idle, form(transfer))).toEqual({
        status: 'failed',
      });
      expect(payload.create).not.toHaveBeenCalled();
    });
  });

  describe('a card', () => {
    const card = {
      ...filled,
      payment: 'card',
      email: 'Olena@Example.com',
      lines: JSON.stringify([{ id: 1, qty: 2 }]),
      total: '249100',
    };

    it("is placed when every line is in stock, without the receipt's address", async () => {
      expect(await placeOrder(idle, form(card))).toMatchObject({
        status: 'placed',
      });
      const data = payload.create.mock.calls.at(-1)?.[0].data;
      expect(data).toMatchObject({
        payment: 'card',
        paymentStatus: 'awaiting',
      });
      expect(JSON.stringify(data)).not.toContain('example.com');
    });

    it('takes no line made to order: the cart changed under it', async () => {
      expect(
        await placeOrder(
          idle,
          form({ ...filled, payment: 'card', email: 'a@b.ua' }),
        ),
      ).toEqual({ status: 'changed' });
      expect(payload.create).not.toHaveBeenCalled();
    });

    it("asks for the receipt's address with the other fields' errors", async () => {
      expect(
        await placeOrder(idle, form({ ...card, email: '', phone: '1' })),
      ).toEqual({
        status: 'invalid',
        errors: { phone: ['phoneInvalid'], email: ['required'] },
      });
      expect(
        await placeOrder(idle, form({ ...card, email: 'olena@' })),
      ).toEqual({ status: 'invalid', errors: { email: ['emailInvalid'] } });
      expect(payload.find).not.toHaveBeenCalled();
    });

    it('asks no address for another payment', async () => {
      expect(
        await placeOrder(idle, form({ ...filled, email: '' })),
      ).toMatchObject({ status: 'placed' });
    });
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
