import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { requestConsultation } from '@/lib/actions/consultation.actions';
import { consultationMessage } from '@/lib/telegram';
import { consultationRequest, parseConsultationForm } from '@/lib/validators';

vi.mock('server-only', () => ({}));
vi.mock('@payload-config', () => ({ default: {} }));

// The action's Payload, and the work it leaves for after the answer.
const payload = { find: vi.fn(), findGlobal: vi.fn(), create: vi.fn() };
vi.mock('payload', async (original) => ({
  ...(await original<typeof import('payload')>()),
  getPayload: async () => payload,
}));
const later: Promise<unknown>[] = [];
vi.mock('next/server', async (original) => ({
  ...(await original<typeof import('next/server')>()),
  after: (task: () => Promise<unknown>) => later.push(task()),
}));

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
  return data;
};
const filled = {
  name: ' Олена ',
  phone: '067 123-45-67',
  message: 'Суха шкіра взимку',
  product: '7',
  locale: 'uk',
  'cf-turnstile-response': 'token',
};
const idle = { status: 'idle' } as const;

describe('the consultation request schema', () => {
  it.each([
    '067 123 45 67',
    '+38 (067) 123-45-67',
    '380671234567',
    '0671234567',
    '+380671234567',
  ])('keeps %s as +380671234567', (phone) => {
    expect(
      consultationRequest.parse({ name: 'Олена', phone, locale: 'uk' }).phone,
    ).toBe('+380671234567');
  });

  it.each(['', '12345', '+48 600 123 456', '067 123 45 6', '80671234567'])(
    'refuses %j as a phone',
    (phone) => {
      expect(
        parseConsultationForm(form({ name: 'Олена', phone })).errors,
      ).toEqual({ phone: ['phoneInvalid'] });
    },
  );

  it('names what is wrong with the typed fields by their message keys', () => {
    expect(
      parseConsultationForm(
        form({
          name: '  ',
          phone: '0671234567',
          message: 'x'.repeat(1001),
        }),
      ).errors,
    ).toEqual({ name: ['nameRequired'], message: ['messageLong'] });
    expect(
      parseConsultationForm(
        form({ name: 'x'.repeat(101), phone: '0671234567' }),
      ).errors,
    ).toEqual({ name: ['nameLong'] });
  });

  it('drops a broken hidden field instead of showing it as an error', () => {
    expect(
      parseConsultationForm(
        form({
          name: 'Олена',
          phone: '0671234567',
          message: '   ',
          product: 'abc',
          answers: 'q1,<b>',
          locale: 'de',
          'cf-turnstile-response': 'x'.repeat(2049),
        }),
      ).data,
    ).toEqual({
      name: 'Олена',
      phone: '+380671234567',
      answers: [],
      locale: 'uk',
    });
  });
});

describe('the Telegram message', () => {
  const site = new URL('https://shop.example');

  it('carries the request and a link to it in the admin, as plain text', () => {
    expect(
      consultationMessage(
        {
          id: 42,
          name: 'Olena <b>',
          phone: '+380671234567',
          locale: 'en',
          message: 'Dry skin',
          productName: 'Hydro Serum',
        },
        site,
      ),
    ).toBe(
      [
        'Новий запит на консультацію',
        "Ім'я: Olena <b>",
        'Телефон: +380671234567',
        'Товар: Hydro Serum',
        'Мова: англійська',
        'Що турбує: Dry skin',
        'https://shop.example/admin/collections/consultation-requests/42',
      ].join('\n'),
    );
  });

  it('carries the care finder’s answers before the link', () => {
    expect(
      consultationMessage(
        {
          id: 42,
          name: 'Олена',
          phone: '+380671234567',
          locale: 'uk',
          finderAnswers: 'Тип шкіри? — Суха\nЩо знайомо? — Стягнутість',
        },
        site,
      ),
    ).toBe(
      [
        'Новий запит на консультацію',
        "Ім'я: Олена",
        'Телефон: +380671234567',
        'Відповіді анкети:',
        'Тип шкіри? — Суха',
        'Що знайомо? — Стягнутість',
        'https://shop.example/admin/collections/consultation-requests/42',
      ].join('\n'),
    );
  });

  it('leaves out what the request does not have', () => {
    expect(
      consultationMessage(
        { id: 1, name: 'Олена', phone: '+380671234567', locale: 'uk' },
        site,
      ).split('\n'),
    ).toHaveLength(4);
  });
});

describe('requestConsultation', () => {
  const fetch = vi.fn();
  const answer = (body: object) => ({ status: 200, json: async () => body });

  beforeEach(() => {
    vi.stubGlobal('fetch', fetch);
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot-token');
    vi.stubEnv('TELEGRAM_CHAT_ID', '-100123');
    payload.find.mockResolvedValue({ docs: [{ id: 7, name: 'Hydro Serum' }] });
    payload.create.mockResolvedValue({ id: 42 });
    fetch.mockResolvedValue(answer({ ok: true }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    later.length = 0;
  });

  it('stores nothing and sends nothing when a field is wrong', async () => {
    expect(
      await requestConsultation(idle, form({ ...filled, phone: '123' })),
    ).toEqual({ status: 'invalid', errors: { phone: ['phoneInvalid'] } });
    expect(fetch).not.toHaveBeenCalled();
    expect(payload.create).not.toHaveBeenCalled();
  });

  it('stores nothing when Turnstile refuses the token', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
    fetch.mockResolvedValueOnce(answer({ success: false }));
    expect(await requestConsultation(idle, form(filled))).toEqual({
      status: 'failed',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({
        body: JSON.stringify({ secret: 'secret', response: 'token' }),
      }),
    );
    expect(payload.create).not.toHaveBeenCalled();
  });

  it('stores nothing when Turnstile cannot be reached', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
    fetch.mockRejectedValueOnce(new Error('timeout'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await requestConsultation(idle, form(filled))).toEqual({
      status: 'failed',
    });
    expect(payload.create).not.toHaveBeenCalled();
  });

  it('stores a new request, then tells the Telegram group', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
    fetch.mockResolvedValueOnce(answer({ success: true }));
    expect(await requestConsultation(idle, form(filled))).toEqual({
      status: 'sent',
    });
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'products',
        where: { id: { equals: 7 } },
        overrideAccess: false,
      }),
    );
    expect(payload.create).toHaveBeenCalledWith({
      collection: 'consultation-requests',
      data: {
        name: 'Олена',
        phone: '+380671234567',
        message: 'Суха шкіра взимку',
        product: 7,
        locale: 'uk',
        status: 'new',
      },
    });
    await Promise.all(later);
    const [url, init] = fetch.mock.calls[1];
    expect(url).toBe('https://api.telegram.org/botbot-token/sendMessage');
    expect(JSON.parse(init.body)).toMatchObject({
      chat_id: '-100123',
      text: expect.stringContaining(
        'Телефон: +380671234567\nТовар: Hydro Serum',
      ),
    });
  });

  it('keeps the request without a product that is not published', async () => {
    payload.find.mockResolvedValueOnce({ docs: [] });
    await requestConsultation(idle, form(filled));
    expect(payload.create.mock.calls[0][0].data.product).toBeUndefined();
  });

  it('keeps the care finder’s answers as the questionnaire reads them in Ukrainian', async () => {
    const id = (n: number) => n.toString(16).padStart(24, '0');
    payload.findGlobal.mockResolvedValueOnce({
      enabled: true,
      questions: [
        {
          id: id(100),
          question: 'Тип шкіри?',
          answers: [
            { id: id(1), label: 'Суха' },
            { id: id(2), label: 'Жирна' },
          ],
        },
      ],
      steps: [],
    });
    await requestConsultation(
      idle,
      form({ ...filled, answers: `${id(1)},${id(9)}` }),
    );
    expect(payload.findGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'care-finder', locale: 'uk' }),
    );
    expect(payload.create.mock.calls[0][0].data).toMatchObject({
      finderAnswers: 'Тип шкіри? — Суха',
    });
    expect(payload.create.mock.calls[0][0].data).not.toHaveProperty('answers');
    await Promise.all(later);
    expect(JSON.parse(fetch.mock.calls[0][1].body).text).toContain(
      'Відповіді анкети:\nТип шкіри? — Суха\n',
    );
  });

  it('reads no questionnaire for a request without answers', async () => {
    await requestConsultation(idle, form(filled));
    expect(payload.findGlobal).not.toHaveBeenCalled();
    expect(payload.create.mock.calls[0][0].data.finderAnswers).toBeUndefined();
  });

  it('answers «sent» when Telegram fails: the request waits in the admin', async () => {
    fetch.mockResolvedValueOnce(
      answer({ ok: false, description: 'chat not found' }),
    );
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await requestConsultation(idle, form(filled))).toEqual({
      status: 'sent',
    });
    await Promise.all(later);
    expect(payload.create).toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      'Telegram:',
      new Error('Telegram: chat not found'),
    );
  });

  it('does not take an answer Telegram never gives for a sent message', async () => {
    fetch.mockResolvedValueOnce(answer({ ok: 'yes' }));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await requestConsultation(idle, form(filled));
    await Promise.all(later);
    expect(error).toHaveBeenCalledWith(
      'Telegram:',
      new Error('Telegram: HTTP 200'),
    );
  });

  it('keeps the shopper’s name and phone out of the log of a failed query', async () => {
    payload.create.mockRejectedValueOnce(
      new Error(
        'Failed query: insert into "consultation_requests" …\nparams: Олена,+380671234567',
        {
          cause: Object.assign(new Error('null value in column "status"'), {
            detail: 'Failing row contains (9, Олена, +380671234567, null).',
          }),
        },
      ),
    );
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await requestConsultation(idle, form(filled));
    expect(error).toHaveBeenCalledWith(
      'Consultation request:',
      'null value in column "status"',
    );
    expect(JSON.stringify(error.mock.calls)).not.toContain('+380671234567');
  });

  it('answers «failed» when the request cannot be stored', async () => {
    payload.create.mockRejectedValueOnce(new Error('database down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await requestConsultation(idle, form(filled))).toEqual({
      status: 'failed',
    });
    expect(later).toEqual([]);
  });
});
