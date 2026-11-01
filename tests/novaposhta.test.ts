import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  findSettlements,
  findWarehouses,
} from '@/lib/actions/delivery.actions';
import { NOVA_POSHTA_API } from '@/lib/constants';

vi.mock('server-only', () => ({}));
// Outside a Next request there is no cache to keep answers in: each question goes to Nova Poshta.
vi.mock('next/cache', () => ({
  unstable_cache: (find: unknown) => find,
}));

const KYIV = 'e718a680-4b33-11e4-ab6d-005056801329';
const answer = (data: unknown[], success = true) =>
  Response.json({
    success,
    data,
    errors: success ? [] : ['API key expired'],
    warnings: [],
    // Nova Poshta's `info` is an array in one answer and an object in another.
    info: { totalCount: data.length },
  });

const fetchMock = vi.fn<typeof fetch>();
const sent = () => JSON.parse(String(fetchMock.mock.calls[0][1]?.body));

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('findSettlements', () => {
  it('finds the settlements that have an NP warehouse', async () => {
    fetchMock.mockResolvedValue(
      answer([
        {
          TotalCount: 2,
          Addresses: [
            { Ref: KYIV, Present: 'м. Київ, Київська обл.', Warehouses: 3000 },
            {
              Ref: 'e71abb60-4b33-11e4-ab6d-005056801329',
              Present: 'с. Київець, Львівська обл.',
              Warehouses: 0,
            },
          ],
        },
      ]),
    );
    expect(await findSettlements(' Київ ')).toEqual({
      status: 'found',
      options: [{ ref: KYIV, label: 'м. Київ, Київська обл.' }],
    });
    expect(fetchMock.mock.calls[0][0]).toBe(NOVA_POSHTA_API);
    expect(sent()).toEqual({
      apiKey: '',
      modelName: 'AddressGeneral',
      calledMethod: 'searchSettlements',
      methodProperties: { CityName: 'київ', Limit: '10', Page: '1' },
    });
  });

  it('sends the key and the stub address when they are set', async () => {
    vi.stubEnv('NOVA_POSHTA_API_KEY', 'key-1');
    vi.stubEnv('NOVA_POSHTA_API_URL', 'http://127.0.0.1:4010/');
    fetchMock.mockResolvedValue(answer([{ Addresses: [] }]));
    await findSettlements('київ');
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:4010/');
    expect(sent().apiKey).toBe('key-1');
  });

  it('asks the shopper for Ukrainian instead of sending Latin letters', async () => {
    expect(await findSettlements('Kyiv')).toEqual({ status: 'latin' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks nothing under two letters', async () => {
    expect(await findSettlements(' к ')).toEqual({
      status: 'found',
      options: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['a refusal', () => answer([], false)],
    ['an HTTP error', () => new Response('', { status: 500 })],
    ['an answer of another shape', () => Response.json({ ok: true })],
    ['a settlement of another shape', () => answer([{ Addresses: [{}] }])],
  ])('is unavailable after %s, and logs only what failed', async (_, reply) => {
    fetchMock.mockResolvedValue(reply());
    expect(await findSettlements('Бровари')).toEqual({ status: 'unavailable' });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      'Бровари',
    );
  });

  it('is unavailable when Nova Poshta does not answer', async () => {
    fetchMock.mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    expect(await findSettlements('Бровари')).toEqual({ status: 'unavailable' });
  });
});

describe('findWarehouses', () => {
  const warehouse = (Ref: string, Description: string, more = {}) => ({
    Ref,
    Description,
    WarehouseStatus: 'Working',
    DenyToSelect: '0',
    ...more,
  });

  it('finds the NP warehouses of the settlement that take parcels', async () => {
    fetchMock.mockResolvedValue(
      answer([
        warehouse(
          '47402eb3-e1c2-11e3-8c4a-0050568002cf',
          'Відділення №2: вул. Київська, 302',
        ),
        warehouse(
          '5a39e59a-e1c2-11e3-8c4a-0050568002cf',
          'Відділення №3: вул. Героїв України, 22',
          { DenyToSelect: '1' },
        ),
        warehouse('5a39e5b2-e1c2-11e3-8c4a-0050568002cf', 'Поштомат №4', {
          WarehouseStatus: 'Closed',
        }),
      ]),
    );
    expect(await findWarehouses(KYIV, '')).toEqual({
      status: 'found',
      options: [
        {
          ref: '47402eb3-e1c2-11e3-8c4a-0050568002cf',
          label: 'Відділення №2: вул. Київська, 302',
        },
      ],
    });
    expect(sent().methodProperties).toEqual({
      SettlementRef: KYIV,
      FindByString: '',
      Limit: '20',
      Page: '1',
    });
  });

  it('keeps no more than twenty, whatever comes back', async () => {
    fetchMock.mockResolvedValue(
      answer(
        Array.from({ length: 30 }, (_, i) =>
          warehouse(
            `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
            `Відділення №${i}`,
          ),
        ),
      ),
    );
    const found = await findWarehouses(KYIV, '');
    expect(found.status === 'found' && found.options).toHaveLength(20);
  });

  it('asks nothing for a settlement that is not Nova Poshta’s', async () => {
    expect(await findWarehouses('not-a-ref', '2')).toEqual({
      status: 'found',
      options: [],
    });
    expect(await findWarehouses(KYIV, 'Khreshchatyk')).toEqual({
      status: 'latin',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is unavailable when Nova Poshta refuses', async () => {
    fetchMock.mockResolvedValue(answer([], false));
    expect(await findWarehouses(KYIV, '2')).toEqual({ status: 'unavailable' });
  });
});
