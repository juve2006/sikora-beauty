import { DrizzleQueryError } from '@payloadcms/db-postgres/drizzle';
import { defaultLoggerOptions } from 'payload';
import { pino } from 'pino';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { register } from '@/instrumentation';
import { sentryOptions } from '@/lib/sentry';
import {
  keepRowsOutOfConsole,
  loggable,
  payloadLoggerOptions,
} from '@/lib/server-log';

// What must never reach the host's log, each where Drizzle and the database put it.
const secrets = ['ira@example.com', '+380671234567', 'Ірина', 'Хрещатик'];

// A failed insert as Drizzle throws it: the values on the message's second line and in `params`, the
// row in the database's `detail`.
function failedQuery() {
  const cause = Object.assign(
    new Error(
      'duplicate key value violates unique constraint "customers_phone_idx"',
    ),
    {
      code: '23505',
      detail: 'Key (phone)=(+380671234567) already exists.',
    },
  );
  return new DrizzleQueryError(
    'insert into "customers" ("email", "phone", "first_name") values ($1, $2, $3)',
    ['ira@example.com', '+380671234567', 'Ірина\n    at Хрещатик (x.js:1:2)'],
    cause,
  );
}

function expectNoSecret(text: string) {
  for (const secret of secrets) expect(text).not.toContain(secret);
}

describe('loggable', () => {
  it('keeps what failed and where, and no value', () => {
    const error = Object.assign(failedQuery(), { digest: '2706398703' });
    const text = loggable(error);

    expect(text).toContain('Error: Failed query: insert into "customers"');
    expect(text).toContain('(cause: 23505)');
    expect(text).toContain('digest: 2706398703');
    expect(text).toMatch(/\n {4}at .*server-log\.test\.ts/);
    expectNoSecret(text);
  });

  it('leaves the frames out when the stack does not start with the error', () => {
    const error = new Error('a timer');
    void error.stack;
    error.message = 'Failed query: select 1\nparams: +380671234567';
    const text = loggable(error);

    expect(text).toBe('Error: Failed query: select 1');
  });
});

describe('the console, as `register` wraps it', () => {
  const originals = { error: console.error, warn: console.warn };
  afterEach(() => Object.assign(console, originals));

  it('prints an error without its values, and the rest as it was', () => {
    const printed: unknown[][] = [];
    console.error = (...args: unknown[]) => void printed.push(args);
    console.warn = (...args: unknown[]) => void printed.push(args);
    keepRowsOutOfConsole();

    console.error('⨯', failedQuery());
    console.warn(failedQuery());
    console.error('Order:', 'a failure');
    console.error('(node:8) Warning: a warning');

    expect(printed[0]![0]).toBe('⨯');
    expect(printed[0]![1]).toContain('Failed query: insert into "customers"');
    expect(printed[1]![0]).toContain('(cause: 23505)');
    expect(printed.slice(2)).toEqual([
      ['Order:', 'a failure'],
      ['(node:8) Warning: a warning'],
    ]);
    expectNoSecret(JSON.stringify(printed));
  });

  it('is wrapped when the server starts, with no DSN too', () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    sentryOptions.dsn = undefined;
    const printed: unknown[][] = [];
    console.error = (...args: unknown[]) => void printed.push(args);
    register();
    vi.unstubAllEnvs();

    console.error('⨯', failedQuery());

    expect(printed[0]![1]).toContain('Failed query: insert into "customers"');
    expectNoSecret(JSON.stringify(printed));
  });
});

describe("Payload's logger, as its config builds it", () => {
  const logged = () => {
    const lines: string[] = [];
    const logger = pino(payloadLoggerOptions, {
      write: (line: string) => void lines.push(line),
    });
    return { lines, logger };
  };

  it('is the one the config gives Payload, with its usual output', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://test:test@127.0.0.1:5999/none');
    vi.stubEnv('PAYLOAD_SECRET', 'test-only-not-a-real-secret-0000000');
    const config = await (await import('@/payload.config')).default;
    vi.unstubAllEnvs();

    expect(config.logger).toEqual({
      options: payloadLoggerOptions,
      destination: defaultLoggerOptions,
    });
  });

  it('logs whatever a route threw, and does not throw itself', () => {
    const { lines, logger } = logged();

    expect(() => {
      logger.error({ err: 'Failed query\nparams: +380671234567' });
      logger.error({ err: null });
      logger.error({ err: { message: 'Failed query\nparams: Ірина' } });
    }).not.toThrow();

    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Failed query');
    expectNoSecret(lines.join());
  });

  it('logs an error without its values, however Payload hands it over', () => {
    const { lines, logger } = logged();
    const error = failedQuery();

    logger.error({ err: error });
    logger.error(error);
    logger.error({ err: error, msg: `cannot begin: ${error.message}` });
    logger.error(`Details: ${error.message}`);
    logger.info('Types written');

    expect(lines).toHaveLength(5);
    for (const line of lines.slice(0, 2)) {
      expect(line).toContain('Failed query: insert into \\"customers\\"');
      expect(line).toContain('(cause: 23505)');
      expect(line).toMatch(/at .*server-log\.test\.ts/);
    }
    expect(lines[2]).toContain('cannot begin: Failed query');
    expect(lines[4]).toContain('Types written');
    expectNoSecret(lines.join());
  });
});
