import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Nova Poshta's waybill and its daily tracking (task `np-waybill`). Nova Poshta is `fetch`, by the
// method asked.

vi.mock('server-only', () => ({}));

const payload = {
  find: vi.fn(),
  findByID: vi.fn(),
  db: { updateOne: vi.fn() },
};
const later: (() => Promise<unknown>)[] = [];
vi.mock('next/server', async (original) => ({
  ...(await original<typeof import('next/server')>()),
  after: (task: () => Promise<unknown>) => later.push(task),
}));
const afterTheAnswer = () => Promise.all(later.splice(0).map((task) => task()));

const NOW = '2026-11-09T22:30:00.000Z';
const KEY = 'test-np-key';
const NUMBER = '20450000000001';
const ref = (digit: number) =>
  `${String(digit).repeat(8)}-1111-4111-8111-111111111111`;
const SENDER = ref(1);
const CONTACT = ref(2);
const CITY = ref(3);
const RECIPIENT = ref(4);
const RECIPIENT_CONTACT = ref(5);
const FROM_CITY = ref(6);
const FROM_BRANCH = ref(7);

const answer = (data: unknown[]) =>
  Response.json({ success: true, data, errors: [], errorCodes: [] });
const refusal = (words: string[], codes: string[]) =>
  Response.json({
    success: false,
    data: [],
    errors: words,
    errorCodes: codes,
  });

const fetch = vi.fn();
let saveAnswer: () => Response | Promise<Response>;
let trackedAs: [string, string];
const answers = async (url: string, init: RequestInit) => {
  if (String(url).includes('api.telegram.org'))
    return Response.json({ ok: true });
  const { modelName, calledMethod, methodProperties } = JSON.parse(
    String(init.body),
  );
  if (calledMethod === 'getCounterparties') return answer([{ Ref: SENDER }]);
  if (calledMethod === 'getCounterpartyContactPersons')
    return answer([{ Ref: CONTACT, Phones: '380671112233' }]);
  if (calledMethod === 'getWarehouses') return answer([{ CityRef: CITY }]);
  if (calledMethod === 'save' && modelName === 'Counterparty')
    return answer([
      {
        Ref: RECIPIENT,
        ContactPerson: { data: [{ Ref: RECIPIENT_CONTACT }] },
      },
    ]);
  if (calledMethod === 'save') return saveAnswer();
  if (calledMethod === 'getStatusDocuments')
    return answer(
      methodProperties.Documents.map(
        ({ DocumentNumber }: { DocumentNumber: string }) => ({
          Number: DocumentNumber,
          StatusCode: trackedAs[0],
          Status: trackedAs[1],
        }),
      ),
    );
  throw new Error(`unexpected ${calledMethod}`);
};

// What Nova Poshta was asked by one method.
const asked = (method: string, model?: string) =>
  fetch.mock.calls
    .filter(([url]) => !String(url).includes('api.telegram.org'))
    .map(([, init]) => JSON.parse(init.body))
    .filter(
      ({ calledMethod, modelName }) =>
        calledMethod === method && (!model || modelName === model),
    );
const saved = () => asked('save', 'InternetDocumentGeneral');
const telegrams = () =>
  fetch.mock.calls.filter(([url]) => String(url).includes('api.telegram.org'));

const order = {
  id: 7,
  firstName: 'Олена',
  lastName: 'Коваль',
  phone: '+380671234567',
  settlementRef: ref(8),
  warehouseRef: ref(9),
  total: 124550,
  payment: 'link',
  status: 'confirmed',
  paymentStatus: 'paid',
  waybillNumber: null,
  deliveryCode: null,
};
const owner = { collection: 'users', role: 'owner', id: 1 };
const box = { id: 7, weight: 0.5, width: 20, length: 30, height: 10 };

let np: typeof import('@/lib/novaposhta');
const press = (body: unknown = box, user: unknown = owner) =>
  np.npWaybill.handler({
    user,
    payload,
    headers: new Headers(),
    json: async () => body,
  } as never);
const claim = (free: object) => ({
  collection: 'orders',
  data: { waybillRequestedAt: NOW, updatedAt: NOW },
  options: { atomic: true },
  where: {
    and: [
      { id: { equals: 7 } },
      { status: { in: ['confirmed', 'shipped'] } },
      {
        or: [
          { waybillNumber: { exists: false } },
          { deliveryCode: { equals: '2' } },
        ],
      },
      free,
    ],
  },
});
const release = {
  collection: 'orders',
  data: { waybillRequestedAt: null, updatedAt: NOW },
  options: { atomic: true },
  where: { id: { equals: 7 } },
};

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(NOW) });
  vi.stubGlobal('fetch', fetch);
  vi.stubEnv('NOVA_POSHTA_API_KEY', KEY);
  vi.stubEnv('NOVA_POSHTA_SENDER_CITY', FROM_CITY);
  vi.stubEnv('NOVA_POSHTA_SENDER_WAREHOUSE', FROM_BRANCH);
  fetch.mockImplementation(answers);
  saveAnswer = () => answer([{ IntDocNumber: NUMBER }]);
  payload.findByID.mockResolvedValue(order);
  payload.db.updateOne.mockResolvedValue({ id: 7 });
  np = await import('@/lib/novaposhta');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  fetch.mockReset();
  payload.find.mockReset();
  payload.findByID.mockReset();
  payload.db.updateOne.mockReset();
  later.length = 0;
});

describe('the waybill button', () => {
  it('makes one branch-to-branch waybill, the recipient paying, and keeps its number', async () => {
    const response = await press();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      number: NUMBER,
      status: 'Створено, ще не передано на відправку',
    });
    expect(saved()).toHaveLength(1);
    expect(saved()[0].methodProperties).toEqual({
      Sender: SENDER,
      ContactSender: CONTACT,
      SendersPhone: '380671112233',
      Recipient: RECIPIENT,
      ContactRecipient: RECIPIENT_CONTACT,
      ServiceType: 'WarehouseWarehouse',
      PayerType: 'Recipient',
      PaymentMethod: 'Cash',
      CargoType: 'Parcel',
      // Kyiv's date: 22:30 UTC is already the 10th there.
      DateTime: '10.11.2026',
      SeatsAmount: '1',
      Weight: '0.5',
      OptionsSeat: [
        {
          volumetricVolume: '1.5',
          volumetricWidth: '20',
          volumetricLength: '30',
          volumetricHeight: '10',
          weight: '0.5',
        },
      ],
      Description: 'Косметичні засоби',
      Cost: '1245.50',
      CitySender: FROM_CITY,
      SenderAddress: FROM_BRANCH,
      CityRecipient: CITY,
      RecipientAddress: order.warehouseRef,
      RecipientsPhone: '380671234567',
    });
    expect(payload.db.updateOne).toHaveBeenLastCalledWith({
      collection: 'orders',
      data: {
        waybillNumber: NUMBER,
        deliveryCode: '1',
        deliveryStatus: 'Створено, ще не передано на відправку',
        waybillRequestedAt: null,
        updatedAt: NOW,
      },
      options: { atomic: true },
      where: { id: { equals: 7 } },
    });
  });

  it('asks for the recipient without a patronymic and the settlement of the order', async () => {
    await press();

    expect(asked('save', 'Counterparty')[0].methodProperties).toEqual({
      FirstName: 'Олена',
      MiddleName: '',
      LastName: 'Коваль',
      Phone: '380671234567',
      CounterpartyType: 'PrivatePerson',
      CounterpartyProperty: 'Recipient',
    });
    expect(asked('getWarehouses')[0].methodProperties).toEqual({
      SettlementRef: order.settlementRef,
      Limit: '1',
      Page: '1',
    });
  });

  it.each([
    [5, '0.05'],
    [100, '1.00'],
    [339000, '3390.00'],
  ])('sends %i kopiyky as %s', async (total, cost) => {
    payload.findByID.mockResolvedValue({ ...order, total });
    await press();
    expect(saved()[0].methodProperties.Cost).toBe(cost);
  });

  it.each([
    [349_999, 'Recipient'],
    [350_000, 'Sender'],
  ])(
    'has an order of %i kopiyky delivered at the cost of the %s',
    async (total, payer) => {
      payload.findByID.mockResolvedValue({ ...order, total });
      await press();
      expect(saved()[0].methodProperties.PayerType).toBe(payer);
    },
  );

  it('adds no cash on delivery', async () => {
    await press();
    const properties = saved()[0].methodProperties;
    expect(properties).not.toHaveProperty('AfterpaymentOnGoodsCost');
    expect(properties).not.toHaveProperty('BackwardDeliveryData');
  });

  it('gives Nova Poshta 15 seconds for the waybill and 5 for the rest', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    await press();
    expect(timeout.mock.calls.map(([ms]) => ms).sort()).toEqual([
      15_000, 5_000, 5_000, 5_000, 5_000,
    ]);
  });

  describe('one waybill per order', () => {
    it('takes the order in one statement before asking Nova Poshta', async () => {
      await press();
      expect(payload.db.updateOne).toHaveBeenNthCalledWith(
        1,
        claim({ waybillRequestedAt: { exists: false } }),
      );
    });

    it('asks nothing of Nova Poshta when another press has it', async () => {
      payload.db.updateOne.mockResolvedValueOnce(null);
      const response = await press();

      expect(response.status).toBe(409);
      expect(fetch).not.toHaveBeenCalled();
      expect(payload.db.updateOne).toHaveBeenCalledTimes(1);
    });

    it('sends again only a request older than a minute, or an order a failed retry freed', async () => {
      await press({ ...box, again: true });
      expect(payload.db.updateOne).toHaveBeenNthCalledWith(
        1,
        claim({
          or: [
            { waybillRequestedAt: { exists: false } },
            { waybillRequestedAt: { less_than: '2026-11-09T22:29:00.000Z' } },
          ],
        }),
      );
    });

    it('keeps the order taken and says so when Nova Poshta never answers the waybill', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      saveAnswer = () => {
        throw new DOMException('timed out', 'TimeoutError');
      };
      const response = await press();

      expect(response.status).toBe(504);
      expect(await response.json()).toEqual({ lost: true });
      expect(payload.db.updateOne).toHaveBeenCalledTimes(1);
    });

    it('treats a 5xx or an unreadable answer to the waybill as lost too', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      for (const bad of [
        new Response('', { status: 502 }),
        answer([{ IntDocNumber: 'not-a-number' }]),
      ]) {
        saveAnswer = () => bad;
        expect(await (await press()).json()).toEqual({ lost: true });
      }
    });

    it('frees the order when the failure comes before the waybill', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      fetch.mockImplementation(async (url, init) =>
        JSON.parse(init.body).calledMethod === 'getWarehouses'
          ? new Response('', { status: 500 })
          : answers(url, init),
      );
      const response = await press();

      expect(response.status).toBe(502);
      expect((await response.json()).lost).toBeUndefined();
      expect(saved()).toHaveLength(0);
      expect(payload.db.updateOne).toHaveBeenLastCalledWith(release);
    });

    it('still answers lost, naming the number in the log, when the database fails after Nova Poshta made it', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      payload.db.updateOne
        .mockResolvedValueOnce({ id: 7 })
        .mockRejectedValueOnce(new Error('connection lost'));
      const response = await press();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ lost: true });
      expect(log.mock.calls[0].join(' ')).toContain(NUMBER);
    });
  });

  describe("Nova Poshta's refusal", () => {
    beforeEach(() => {
      saveAnswer = () =>
        refusal(['Олена: одержувач вказаний невірно'], ['20000200001']);
    });

    it('reaches the manager, frees the order and writes no number', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const response = await press();

      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({
        error: 'Олена: одержувач вказаний невірно',
      });
      expect(payload.db.updateOne).toHaveBeenLastCalledWith(release);
      expect(payload.db.updateOne).toHaveBeenCalledTimes(2);
    });

    it('logs its codes and nothing it said', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      await press();

      expect(log).toHaveBeenCalledTimes(1);
      const line = log.mock.calls[0].join(' ');
      expect(line).toContain('20000200001');
      expect(line).not.toContain('Олена');
    });
  });

  describe('who and what it refuses', () => {
    it.each([
      ['a shopper', { collection: 'customers', id: 1 }],
      ['a visitor', null],
    ])('%s: 403, reading nothing and asking nothing', async (_, user) => {
      const response = await press(box, user);

      expect(response.status).toBe(403);
      expect(payload.findByID).not.toHaveBeenCalled();
      expect(payload.db.updateOne).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });

    it.each([
      ['no body', null],
      ['a box too light', { ...box, weight: 0.05 }],
      ['a box too heavy', { ...box, weight: 31 }],
      ['a side too long', { ...box, width: 121 }],
      ['a side empty', { ...box, height: '' }],
      ['no order', { ...box, id: undefined }],
    ])('%s: 400', async (_, body) => {
      expect((await press(body)).status).toBe(400);
      expect(payload.findByID).not.toHaveBeenCalled();
    });

    it.each([
      'NOVA_POSHTA_API_KEY',
      'NOVA_POSHTA_SENDER_CITY',
      'NOVA_POSHTA_SENDER_WAREHOUSE',
    ])('without %s: off, and Nova Poshta is not asked', async (name) => {
      vi.stubEnv(name, '');
      const response = await press();

      expect(np.waybillsEnabled()).toBe(false);
      expect(response.status).toBe(503);
      expect(payload.db.updateOne).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });

    it("reads the order under the manager's own access", async () => {
      await press();
      expect(payload.findByID).toHaveBeenCalledWith(
        expect.objectContaining({ overrideAccess: false, user: owner }),
      );
    });

    it('an order that cannot have one: 409 with the reason, nothing taken', async () => {
      payload.findByID.mockResolvedValue({
        ...order,
        paymentStatus: 'awaiting',
      });
      const response = await press();

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: 'Замовлення ще не оплачене',
      });
      expect(payload.db.updateOne).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('an order that is not there: 409', async () => {
      payload.findByID.mockResolvedValue(null);
      expect((await press()).status).toBe(409);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  it('never lets the key out: only in the body of a request to Nova Poshta', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    saveAnswer = () => refusal(['ні'], ['1']);
    const response = await press();

    expect(JSON.stringify(await response.json())).not.toContain(KEY);
    expect(JSON.stringify(log.mock.calls)).not.toContain(KEY);
    expect(asked('save', 'InternetDocumentGeneral')[0].apiKey).toBe(KEY);
    for (const [url] of fetch.mock.calls)
      expect(String(url)).not.toContain(KEY);
  });
});

describe('the daily tracking', () => {
  const SECRET = 'x'.repeat(16);
  const run = (authorization?: string) =>
    np.npTrack.handler({
      headers: new Headers(authorization ? { authorization } : {}),
      payload,
    } as never);
  const moved = (number: string, code: string, status: string) => ({
    collection: 'orders',
    data: { deliveryCode: code, deliveryStatus: status, updatedAt: NOW },
    options: { atomic: true },
    where: {
      and: [
        { waybillNumber: { equals: number } },
        {
          or: [
            { deliveryCode: { exists: false } },
            { deliveryCode: { not_equals: code } },
          ],
        },
      ],
    },
  });

  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', SECRET);
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot');
    vi.stubEnv('TELEGRAM_CHAT_ID', 'chat');
    trackedAs = ['6', 'У місті'];
    payload.find.mockResolvedValue({
      docs: [
        { id: 1, waybillNumber: '20450000000001' },
        { id: 2, waybillNumber: '20450000000002' },
      ],
    });
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

  it('asks of the 100 oldest unfinished waybills younger than 60 days, once and without a phone', async () => {
    const response = await run(`Bearer ${SECRET}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ checked: 2, moved: 2 });
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'orders',
        where: {
          and: [
            { waybillNumber: { exists: true } },
            { createdAt: { greater_than: '2026-09-10T22:30:00.000Z' } },
            {
              or: [
                { deliveryCode: { exists: false } },
                {
                  deliveryCode: {
                    // A final code is not asked of again; any other, an unknown one too, is.
                    not_in: ['2', '9', '10', '11', '102', '103', '106'],
                  },
                },
              ],
            },
          ],
        },
        sort: 'createdAt',
        limit: 100,
        overrideAccess: true,
        select: { waybillNumber: true },
      }),
    );
    expect(asked('getStatusDocuments')).toEqual([
      expect.objectContaining({
        modelName: 'TrackingDocumentGeneral',
        methodProperties: {
          Documents: [
            { DocumentNumber: '20450000000001' },
            { DocumentNumber: '20450000000002' },
          ],
        },
      }),
    ]);
    expect(payload.db.updateOne).toHaveBeenCalledWith(
      moved('20450000000001', '6', 'У місті'),
    );
  });

  it('asks nothing when no waybill is going', async () => {
    payload.find.mockResolvedValue({ docs: [] });
    expect(await (await run(`Bearer ${SECRET}`)).json()).toEqual({
      checked: 0,
      moved: 0,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['102', 'Відмова, повернення'],
    ['103', 'Відмова від отримання'],
    ['105', 'Припинено зберігання'],
  ])('tells the manager of %s, once', async (code, status) => {
    trackedAs = [code, status];
    payload.find.mockResolvedValue({
      docs: [{ id: 1, waybillNumber: NUMBER }],
    });
    payload.db.updateOne.mockResolvedValueOnce({ id: 11 });
    await run(`Bearer ${SECRET}`);
    await afterTheAnswer();

    expect(telegrams()).toHaveLength(1);
    const { text } = JSON.parse(telegrams()[0][1].body);
    expect(text).toContain('замовлення №11');
    expect(text).toContain(NUMBER);
    expect(text).toContain(status);

    // The cron run again finds nothing to change.
    payload.db.updateOne.mockResolvedValue(null);
    await run(`Bearer ${SECRET}`);
    await afterTheAnswer();
    expect(telegrams()).toHaveLength(1);
  });

  it('does not tell the manager of a parcel on its way', async () => {
    await run(`Bearer ${SECRET}`);
    await afterTheAnswer();
    expect(telegrams()).toHaveLength(0);
  });

  it('logs a failure to ask and writes nothing', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetch.mockResolvedValue(new Response('', { status: 500 }));
    const response = await run(`Bearer ${SECRET}`);

    expect(response.status).toBe(502);
    expect(log).toHaveBeenCalledTimes(1);
    expect(payload.db.updateOne).not.toHaveBeenCalled();
  });

  it('goes on past a row it cannot write', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    payload.db.updateOne
      .mockRejectedValueOnce(new Error('connection lost'))
      .mockResolvedValueOnce({ id: 2 });
    const response = await run(`Bearer ${SECRET}`);

    expect(await response.json()).toEqual({ checked: 2, moved: 1 });
    expect(log).toHaveBeenCalledTimes(1);
  });
});
