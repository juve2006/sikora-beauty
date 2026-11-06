import type { TextField } from 'payload';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaymentDetails } from '@/globals/payment-details';
import {
  getPaymentDetails,
  getPlacedOrder,
} from '@/lib/actions/payment.actions';
import { iban, returnToken, taxCode } from '@/lib/validators';

vi.mock('server-only', () => ({}));
vi.mock('@payload-config', () => ({ default: {} }));

const payload = { find: vi.fn(), findGlobal: vi.fn() };
vi.mock('payload', async (original) => ({
  ...(await original<typeof import('payload')>()),
  getPayload: async () => payload,
}));

// The NBU's sample account, which passes the check.
const SAMPLE = 'UA213223130000026007233566001';

describe('an IBAN', () => {
  it('takes a Ukrainian account, typed in fours or in lower case', () => {
    expect(iban.parse(SAMPLE)).toBe(SAMPLE);
    expect(iban.parse('ua21 3223 1300 0002 6007 2335 6600 1')).toBe(SAMPLE);
  });

  it('refuses a mistyped digit, a short one and a foreign one', () => {
    expect(iban.safeParse('UA213223130000026007233566002').success).toBe(false);
    expect(iban.safeParse('UA21322313000002600723356600').success).toBe(false);
    expect(iban.safeParse('DE89370400440532013000').success).toBe(false);
  });
});

describe('a tax code', () => {
  it('takes an EDRPOU of eight digits and an RNOKPP of ten', () => {
    expect(taxCode.safeParse('12345678').success).toBe(true);
    expect(taxCode.safeParse('1234567890').success).toBe(true);
  });

  it('refuses anything else', () => {
    for (const code of ['1234567', '123456789', '12345678901', '12345678a'])
      expect(taxCode.safeParse(code).success).toBe(false);
  });
});

describe('a return token', () => {
  it('takes the 22 characters `placeOrder` gives, the first of several', () => {
    expect(returnToken.safeParse('Ab-_'.repeat(5) + 'xy').success).toBe(true);
    expect(returnToken.parse(['a'.repeat(22), 'b'.repeat(22)])).toBe(
      'a'.repeat(22),
    );
  });

  it('refuses another length or a character base64url has not', () => {
    for (const token of ['a'.repeat(21), 'a'.repeat(23), `${'a'.repeat(21)}=`])
      expect(returnToken.safeParse(token).success).toBe(false);
    expect(returnToken.safeParse(undefined).success).toBe(false);
  });
});

describe('the payment details in the admin', () => {
  const field = (name: string) =>
    PaymentDetails.fields.find(
      (f) => 'name' in f && f.name === name,
    ) as TextField;
  const validate = (name: string, value: unknown) =>
    (field(name).validate as (value: unknown) => true | string)(value);

  it('keeps an IBAN without its spaces, in capitals', () => {
    const [clean] = field('iban').hooks!.beforeValidate!;
    expect(
      clean({ value: 'ua21 3223 1300 0002 6007 2335 6600 1' } as never),
    ).toBe(SAMPLE);
  });

  it('says what is wrong with an IBAN or a code, and lets an empty one be', () => {
    expect(validate('iban', SAMPLE)).toBe(true);
    expect(validate('iban', 'UA00')).toMatch(/IBAN/);
    expect(validate('code', '1234567890')).toBe(true);
    expect(validate('code', '123')).toMatch(/РНОКПП/);
    expect(validate('iban', undefined)).toBe(true);
    expect(validate('code', '')).toBe(true);
  });
});

describe('the reads of the thank-you page', () => {
  afterEach(() => vi.clearAllMocks());

  it('gives the store’s account only once all three are filled in', async () => {
    payload.findGlobal.mockResolvedValueOnce({
      recipient: ' ФОП Прізвище ',
      iban: SAMPLE,
      code: '1234567890',
    });
    expect(await getPaymentDetails()).toEqual({
      recipient: 'ФОП Прізвище',
      iban: SAMPLE,
      code: '1234567890',
    });
    for (const missing of ['recipient', 'iban', 'code']) {
      payload.findGlobal.mockResolvedValueOnce({
        recipient: 'ФОП Прізвище',
        iban: SAMPLE,
        code: '1234567890',
        [missing]: missing === 'recipient' ? ' ' : null,
      });
      expect(await getPaymentDetails()).toBeUndefined();
    }
  });

  const placed = {
    id: 17,
    total: 249100,
    payment: 'transfer',
    status: 'new',
    paymentStatus: 'awaiting',
  };

  it('finds an order by its secret and reads only its number, sum, payment and statuses', async () => {
    payload.find.mockResolvedValueOnce({ docs: [placed] });
    expect(await getPlacedOrder('a'.repeat(22))).toEqual({
      number: 17,
      total: 249100,
      payment: 'transfer',
      paymentStatus: 'awaiting',
      cancelled: false,
      invoiced: false,
      payable: true,
    });
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'orders',
        where: { returnToken: { equals: 'a'.repeat(22) } },
        overrideAccess: true,
        select: {
          total: true,
          payment: true,
          status: true,
          paymentStatus: true,
          monoInvoiceId: true,
        },
      }),
    );
  });

  // A link kept for later asks for no money the store would send back.
  it('asks no payment for an order paid or cancelled', async () => {
    for (const changed of [
      { paymentStatus: 'paid' },
      { status: 'cancelled' },
    ]) {
      payload.find.mockResolvedValueOnce({ docs: [{ ...placed, ...changed }] });
      expect(await getPlacedOrder('a'.repeat(22))).toMatchObject({
        payable: false,
      });
    }
  });

  // A card's thanks: whether the bank's word is still to come, by its invoice.
  it('says whether a card has its invoice', async () => {
    payload.find.mockResolvedValueOnce({
      docs: [{ ...placed, payment: 'card', monoInvoiceId: 'inv-1' }],
    });
    expect(await getPlacedOrder('a'.repeat(22))).toMatchObject({
      payment: 'card',
      invoiced: true,
    });
  });

  it('finds nothing by a secret no order has', async () => {
    payload.find.mockResolvedValueOnce({ docs: [] });
    expect(await getPlacedOrder('b'.repeat(22))).toBeUndefined();
  });
});
