import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { defaultStackParser } from '@sentry/browser';
import * as Sentry from '@sentry/nextjs';
import type { ErrorEvent } from '@sentry/nextjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { register } from '@/instrumentation';
import { keepWhatFailed, sentryOptions } from '@/lib/sentry';
import { whatFailed } from '@/lib/utils';

const dsn = 'https://key@o1.ingest.de.sentry.io/1';
const sent = vi.hoisted(() => [] as string[]);

// The SDK itself, as the code starts it, with what would have left kept here instead.
vi.mock('@sentry/nextjs', async (importOriginal) => {
  const sdk = await importOriginal<typeof Sentry>();
  return {
    ...sdk,
    captureException: vi.fn(sdk.captureException),
    init: vi.fn((options: Sentry.NodeOptions) =>
      sdk.init({
        ...options,
        transport: () => ({
          send: async (envelope: unknown) => {
            sent.push(JSON.stringify(envelope));
            return {};
          },
          flush: async () => true,
        }),
      }),
    ),
  };
});
vi.mock('@sentry/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/browser')>()),
  init: vi.fn(),
}));

// Everything that must never leave, each where the SDK or a failure would put it.
const secrets = [
  'Ірина',
  'Шевченка',
  'Shevchenko',
  'Хрещатик',
  'ira_shevchenko',
  'Viber',
  'ira@example.com',
  '+380671234567',
  'letter-token',
  'staff-token',
  'google-code',
  'site-password',
  'session-cookie',
  '123456:bot-secret',
  'typed-in-a-form',
];

const dirty: ErrorEvent = {
  type: undefined,
  event_id: 'abc',
  timestamp: 1,
  platform: 'node',
  level: 'error',
  environment: 'production',
  release: 'r1',
  server_name: 'Ірина-host',
  transaction: 'POST /account/reset?token=letter-token',
  message:
    'Failed for ira@example.com at +380 67 123 45 67\nparams: Ірина,Шевченка',
  user: { id: '1', email: 'ira@example.com', ip_address: '1.2.3.4' },
  tags: { phone: '+380671234567' },
  extra: { arguments: ['typed-in-a-form'] },
  modules: { Ірина: '1' },
  contexts: {
    nextjs: { request_path: '/account/reset?token=letter-token' },
  },
  request: {
    url: 'https://sikora.example/account/verify?token=letter-token',
    query_string: 'code=google-code',
    cookies: { 'payload-token': 'session-cookie' },
    headers: { authorization: 'Basic site-password' },
    data: { name: 'Ірина', address: 'Шевченка' },
  },
  breadcrumbs: [
    {
      category: 'fetch',
      data: {
        url: 'https://api.telegram.org/bot123456:bot-secret/sendMessage',
      },
    },
  ],
  exception: {
    values: [
      {
        type: 'Error',
        value:
          'Failed query: insert into "orders" values ($1)\nparams: Ірина,+380671234567,Шевченка',
        mechanism: {
          type: 'generic',
          handled: true,
          data: { body: 'typed-in-a-form' },
        },
        stacktrace: {
          frames: [
            {
              filename: 'https://sikora.example/_next/order.js',
              function: 'placeOrder',
              lineno: 7,
              vars: { name: 'Ірина' },
              context_line: 'typed-in-a-form',
            },
            {
              // An inline script's frame, and one the browser's SDK adds to an error with no stack.
              filename:
                'https://sikora.example/account/reset?token=letter-token#google-code',
              lineno: 1,
            },
            {
              filename: 'https://sikora.example/admin/reset/staff-token',
              lineno: 1,
            },
            {
              // What the SDK's parser makes of a param with "at " in it, on the line after the message.
              filename: 'Shevchenko,Ірина,+380671234567',
              module: 'Шевченка',
            },
            // The same with a time after it, which reads as a line and a column.
            { filename: 'Хрещатик 12', lineno: 30, colno: 0 },
            { filename: '/Хрещатик', lineno: 12, colno: 1 },
            // A param that begins like an address: only the missing line number gives it away.
            { filename: 'https://ig.example/Шевченка' },
            // The time at the end of a row reads as a line and a column, and the row is in the name.
            {
              filename: 'https://t.me/ira_shevchenko please,uk,Шевченка',
              lineno: 32,
              colno: 33,
            },
          ],
        },
      },
      {
        type: 'Error',
        value: `Can't send mail: 550 <ira@example.com> at https://api.telegram.org/bot123456:bot-secret/x?code=google-code`,
      },
    ],
  },
};

describe('keepWhatFailed', () => {
  const kept = keepWhatFailed(dirty);

  it.each(secrets)('sends no %s', (secret) => {
    expect(JSON.stringify(kept)).not.toContain(secret);
  });

  it('keeps what tells what failed and where', () => {
    const [first, second] = kept.exception?.values ?? [];
    expect(first?.value).toBe('Failed query: insert into "orders" values ($1)');
    expect(first?.stacktrace?.frames?.[0]).toEqual({
      filename: 'https://sikora.example/_next/order.js',
      function: 'placeOrder',
      lineno: 7,
    });
    expect(second?.value).toContain("Can't send mail: 550");
    expect(kept.transaction).toBe('POST /account/reset?[query]');
    expect(kept).toMatchObject({
      level: 'error',
      environment: 'production',
      release: 'r1',
    });
  });

  it('names the page by its path when no route is known', () => {
    const { transaction } = keepWhatFailed({
      type: undefined,
      request: { url: 'https://sikora.example/cart/thanks?order=7' },
    });
    expect(transaction).toBe('/cart/thanks');
    expect(
      keepWhatFailed({
        type: undefined,
        request: { url: 'https://sikora.example/admin/reset/staff-token' },
      }).transaction,
    ).toBe('/admin/reset/[token]');
  });

  it('keeps what finds the source maps, without a query', () => {
    const image = { type: 'sourcemap' as const, debug_id: 'd' };
    const { debug_meta } = keepWhatFailed({
      type: undefined,
      debug_meta: {
        images: [
          { ...image, code_file: 'https://s.example/verify/b/a.js?token=b' },
        ],
      },
    });
    expect(debug_meta?.images).toEqual([
      { ...image, code_file: 'https://s.example/verify/[token]/a.js' },
    ]);
  });

  // A `beforeSend` that throws loses the event. On the server `@sentry/nextjs`'s own processor throws
  // on such an error first (ADR); the browser, on `@sentry/browser`, comes this far.
  it.each([[42], [{ code: 42 }]])(
    'keeps the event of an error whose message is %j',
    (value) => {
      const { exception } = keepWhatFailed({
        type: undefined,
        exception: { values: [{ type: 'Error', value: value as never }] },
      });
      expect(exception?.values?.[0]).toEqual({
        type: 'Error',
        value: undefined,
        mechanism: undefined,
        stacktrace: undefined,
      });
    },
  );

  it.each([
    ['Chrome', 'Error: a\n    at f (https://s.example/_next/a.js:1:2)'],
    ['Firefox and Safari', 'f@https://s.example/_next/a.js:1:2'],
    [
      'a message of several lines',
      'Error: a\nparams: Ірина at home\n    at f (https://s.example/_next/a.js:1:2)',
    ],
  ])('keeps the real frame of %s and no other', (_, stack) => {
    const frames = defaultStackParser(stack);
    const { exception } = keepWhatFailed({
      type: undefined,
      exception: { values: [{ stacktrace: { frames } }] },
    });
    expect(exception?.values?.[0]?.stacktrace?.frames).toEqual([
      expect.objectContaining({
        filename: 'https://s.example/_next/a.js',
        lineno: 1,
        colno: 2,
      }),
    ]);
  });

  it('makes no frame of a line of the message, in a browser too', () => {
    const value =
      'failed\nІрина Шевченка, +380671234567 https://ig.example/x:1:2';
    const frames = defaultStackParser(
      `Error: ${value}\n    at f (https://s.example/_next/a.js:1:2)`,
    );
    const { exception } = keepWhatFailed({
      type: undefined,
      exception: { values: [{ value, stacktrace: { frames } }] },
    });
    expect(
      exception?.values?.[0]?.stacktrace?.frames?.map((f) => f.filename),
    ).toEqual(['https://s.example/_next/a.js']);
  });

  it('keeps a file name a mask would break', () => {
    const filename = 'https://s.example/_next/static/chunks/0123456789012.js';
    const frames = [{ filename, lineno: 1 }];
    const { exception } = keepWhatFailed({
      type: undefined,
      exception: { values: [{ stacktrace: { frames } }] },
    });
    expect(exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename).toBe(
      filename,
    );
  });

  it.each([
    [
      'POST /api/customers/verify/letter-token',
      'POST /api/customers/verify/[token]',
    ],
    ['/admin/reset/staff-token', '/admin/reset/[token]'],
    ['/account/reset', '/account/reset'],
    ['GET /a#access_token=letter-token', 'GET /a#[query]'],
    ['GET /a?name=Ірина Шевченка tail', 'GET /a?[query]'],
    ['GET /a#name=Ірина Шевченка', 'GET /a#[query]'],
    ['/bot123456%3Abot-secret/send', '/bot[token]/send'],
    ['ira%40example.com failed', '[email] failed'],
    ['call 067.123.45.67', 'call [phone]'],
    ['first\rparams: Ірина', 'first'],
    ['first\u2028params: Ірина', 'first'],
    ['Minified React error #441', 'Minified React error #441'],
  ])('reads %s as %s', (transaction, expected) => {
    expect(keepWhatFailed({ type: undefined, transaction }).transaction).toBe(
      expected,
    );
  });
});

describe('the options, through the SDK itself', () => {
  beforeEach(() => {
    sent.length = 0;
  });
  afterEach(() => Sentry.close());

  it('sends nothing but the kept event, whatever the scope holds', async () => {
    Sentry.init({ ...sentryOptions, dsn });
    Sentry.withScope((scope) => {
      scope.setUser({ email: 'ira@example.com' });
      scope.setContext('nextjs', { request_path: '/a?token=letter-token' });
      scope.setExtra('body', 'typed-in-a-form');
      Sentry.addBreadcrumb({
        message: 'https://api.telegram.org/bot123456:bot-secret',
      });
      Sentry.captureException(
        new Error(
          'Failed query: insert\nparams: Renat Shevchenko,Ірина,+380671234567',
        ),
      );
    });
    await Sentry.flush(1000);

    expect(sent.join()).toContain('Failed query: insert');
    for (const secret of secrets) expect(sent.join()).not.toContain(secret);
  });
});

describe('on the server, as `register` starts it', () => {
  const vercel = Symbol.for('@vercel/request-context');

  beforeEach(() => {
    sent.length = 0;
    sentryOptions.dsn = dsn;
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.mocked(Sentry.init).mockClear();
  });
  afterEach(async () => {
    sentryOptions.dsn = undefined;
    vi.unstubAllEnvs();
    Reflect.deleteProperty(globalThis, vercel);
    await Sentry.close();
  });

  it('starts nothing without a DSN', () => {
    sentryOptions.dsn = undefined;
    register();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('reports what is only logged, and only what the list allows', async () => {
    register();
    Sentry.withScope((scope) => {
      scope.setUser({ email: 'ira@example.com' });
      scope.setExtra('body', 'typed-in-a-form');
      console.error('Telegram: Unauthorized\nparams: Ірина,+380671234567');
      console.error(
        new Error('Failed query\nparams: Leave it at 12:30:00 Хрещатик'),
      );
    });
    await Sentry.flush(1000);

    expect(sent.join()).toContain('Telegram: Unauthorized');
    expect(sent.join()).not.toContain('stacktrace');
    for (const secret of secrets) expect(sent.join()).not.toContain(secret);
  });

  it('names what failed when a caught error is logged', async () => {
    register();
    console.error(
      'Telegram:',
      whatFailed(
        new TypeError('fetch failed', { cause: new Error('timeout') }),
      ),
    );
    await Sentry.flush(1000);

    expect(sent.join()).toContain('Telegram: timeout');
  });

  // Node prints its warnings through `console.error`; they are no failure and stay in the host's log.
  it("leaves Node's own warnings out", async () => {
    register();
    console.error('(node:8) Warning: SECURITY WARNING: The SSL modes');
    console.error('(node:8) [DEP0040] DeprecationWarning: punycode');
    console.error('Order: a failure');
    await Sentry.flush(1000);

    expect(sent.join()).toContain('Order: a failure');
    expect(sent.join()).not.toContain('Warning');
  });

  // A row of `orders` ends in its times, which the SDK's parser reads as a line and a column, and it
  // decodes what it takes for a file's name.
  it.each([
    'Text me at https://t.me/ira_shevchenko please,uk,Шевченка,Ірина,+380671234567,2026-11-05T14:32:33.069Z',
    'Renat Shevchenko,мій телеграм (https://t.me/ira_shevchenko),Ірина,2026-11-05T14:32:33.069Z',
    'Renat Shevchenko,Ірина,+380671234567,мій телеграм (https://t.me/%D1%96%D1%80%D0%B0:1:2)\nдякую,2026-11-05T14:32:33.069Z',
    'Leave at /12 Хрещатик,Ірина,2026-11-05T14:32:33.069Z',
    'Write me at app: Viber,Ірина,2026-11-05T14:32:33.069Z',
    'Text me at https://t.me/ira_shevchenko:12:30',
  ])('sends no stack, so no frame of %s', async (params) => {
    register();
    Sentry.captureException(new Error(`Failed query\nparams: ${params}`));
    await Sentry.flush(1000);

    expect(sent.join()).toContain('Failed query');
    expect(sent.join()).not.toContain('stacktrace');
    for (const secret of secrets) expect(sent.join()).not.toContain(secret);
  });

  it('turns off the sessions, which pass no `beforeSend`', () => {
    register();
    const { integrations } = vi.mocked(Sentry.init).mock.calls[0]![0]!;
    const names = (
      integrations as (defaults: { name: string }[]) => { name: string }[]
    )([{ name: 'ProcessSession' }, { name: 'Kept' }]).map(({ name }) => name);
    expect(names).toEqual(['Kept', 'CaptureConsole', 'Http']);
  });

  it('adds nothing of its own to a request to another service', async () => {
    const seen: string[][] = [];
    const service = createServer((request, response) => {
      seen.push(Object.keys(request.headers));
      response.end();
    });
    await new Promise<void>((done) => service.listen(0, '127.0.0.1', done));
    register();
    await fetch(`http://127.0.0.1:${(service.address() as AddressInfo).port}/`);
    service.close();
    expect(seen[0]).not.toContain('sentry-trace');
    expect(seen[0]).not.toContain('baggage');
  });

  it('holds a Vercel function until the event has left', async () => {
    const waitUntil = vi.fn();
    Reflect.set(globalThis, vercel, { get: () => ({ waitUntil }) });
    register();
    Sentry.captureException(new Error('a failure'));
    await Sentry.flush(1000);
    expect(waitUntil).toHaveBeenCalledOnce();
    await expect(waitUntil.mock.calls[0]![0]).resolves.toBe(true);
  });
});

describe('in the browser, as its file starts it', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it('starts nothing without a DSN', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
    const { init } = await import('@sentry/browser');
    vi.mocked(init).mockClear();
    await import('@/instrumentation-client');
    expect(init).not.toHaveBeenCalled();
  });

  it('starts only what an error needs, through the list', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', dsn);
    const { init } = await import('@sentry/browser');
    vi.mocked(init).mockClear();
    await import('@/instrumentation-client');

    const options = vi.mocked(init).mock.calls[0]![0]!;
    expect(options.defaultIntegrations).toBe(false);
    expect(
      (options.integrations as { name: string }[]).map(({ name }) => name),
    ).toEqual(['GlobalHandlers', 'LinkedErrors', 'Dedupe', 'HttpContext']);
    const kept = options.beforeSend?.(dirty, {});
    for (const secret of secrets)
      expect(JSON.stringify(kept)).not.toContain(secret);
  });
});

describe('the site, as `next.config.ts` builds it', () => {
  it("puts none of Sentry's tags on a page", async () => {
    const { default: config } = await import('../next.config');
    expect(config.experimental?.clientTraceMetadata).toBeUndefined();
  });
});

describe('Payload, as its config reports', () => {
  it('reports a failure, not a refusal', async () => {
    vi.resetModules();
    vi.stubEnv('DATABASE_URL', 'postgres://test:test@127.0.0.1:5999/none');
    vi.stubEnv('PAYLOAD_SECRET', 'test-only-not-a-real-secret-0000000');
    const { captureException } = await import('@sentry/nextjs');
    const config = await (await import('@/payload.config')).default;
    const hook = config.hooks?.afterError?.[0] as (args: {
      error: Error;
    }) => void;

    hook({ error: Object.assign(new Error('refused'), { status: 403 }) });
    // GraphQL wraps the refusal and keeps its status on the error it wraps.
    hook({
      error: Object.assign(new Error('refused'), {
        originalError: Object.assign(new Error('refused'), { status: 403 }),
      }),
    });
    expect(captureException).not.toHaveBeenCalled();

    for (const error of [
      new Error('no status'),
      Object.assign(new Error('failed'), { status: 500 }),
    ]) {
      hook({ error });
      expect(captureException).toHaveBeenLastCalledWith(error);
    }
    vi.unstubAllEnvs();
  });
});
