import { describe, expect, it } from 'vitest';

import { parseEnv } from '@/lib/env';

const valid = {
  DATABASE_URL: 'postgres://user:secret-password@127.0.0.1:5432/sikora',
  PAYLOAD_SECRET: 'x'.repeat(32),
};

describe('parseEnv', () => {
  it('accepts a complete environment', () => {
    expect(parseEnv(valid)).toEqual(valid);
  });

  it('names every missing or malformed variable', () => {
    expect(() => parseEnv({ PAYLOAD_SECRET: 'short' })).toThrow(
      'Invalid environment variables: DATABASE_URL, PAYLOAD_SECRET',
    );
  });

  it('takes the AI key as .env.example leaves it, empty', () => {
    expect(
      parseEnv({ ...valid, ANTHROPIC_API_KEY: '' }).ANTHROPIC_API_KEY,
    ).toBe('');
  });

  it('needs the Blob token on Vercel only', () => {
    expect(() => parseEnv({ ...valid, VERCEL: '1' })).toThrow(
      'Invalid environment variables: BLOB_READ_WRITE_TOKEN',
    );
    expect(
      parseEnv({ ...valid, VERCEL: '1', BLOB_READ_WRITE_TOKEN: 'token' })
        .BLOB_READ_WRITE_TOKEN,
    ).toBe('token');
  });

  it('needs a long site password on Vercel Production only', () => {
    const vercel = { ...valid, VERCEL: '1', BLOB_READ_WRITE_TOKEN: 'token' };
    expect(() => parseEnv({ ...vercel, VERCEL_ENV: 'production' })).toThrow(
      'Invalid environment variables: SITE_PASSWORD',
    );
    expect(() =>
      parseEnv({ ...vercel, VERCEL_ENV: 'production', SITE_PASSWORD: 'short' }),
    ).toThrow('Invalid environment variables: SITE_PASSWORD');
    expect(
      parseEnv({
        ...vercel,
        VERCEL_ENV: 'production',
        SITE_PASSWORD: 'x'.repeat(12),
      }).SITE_PASSWORD,
    ).toBe('x'.repeat(12));
    expect(
      parseEnv({ ...vercel, VERCEL_ENV: 'preview' }).SITE_PASSWORD,
    ).toBeUndefined();
  });

  it('takes Turnstile and Telegram in pairs or not at all', () => {
    expect(() =>
      parseEnv({ ...valid, NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'site' }),
    ).toThrow('Invalid environment variables: TURNSTILE_SECRET_KEY');
    expect(() =>
      parseEnv({ ...valid, TURNSTILE_SECRET_KEY: 'secret' }),
    ).toThrow('Invalid environment variables: TURNSTILE_SECRET_KEY');
    expect(() => parseEnv({ ...valid, TELEGRAM_CHAT_ID: '-100123' })).toThrow(
      'Invalid environment variables: TELEGRAM_BOT_TOKEN',
    );
    expect(
      parseEnv({
        ...valid,
        TELEGRAM_BOT_TOKEN: '',
        TELEGRAM_CHAT_ID: '',
        TURNSTILE_SECRET_KEY: '',
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: '',
      }).TELEGRAM_BOT_TOKEN,
    ).toBe('');
  });

  it('needs Turnstile on a Production with no site password, open to shoppers', () => {
    const production = {
      ...valid,
      VERCEL: '1',
      BLOB_READ_WRITE_TOKEN: 'token',
      VERCEL_ENV: 'production',
    };
    expect(() => parseEnv(production)).toThrow(
      'Invalid environment variables: SITE_PASSWORD, TURNSTILE_SECRET_KEY',
    );
    expect(() =>
      parseEnv({ ...production, SITE_PASSWORD: 'x'.repeat(12) }),
    ).not.toThrow();
  });

  it('never puts a value into the error', () => {
    const leaky = { ...valid, PAYLOAD_SECRET: 'secret-but-too-short' };
    expect(() => parseEnv(leaky)).toThrow(/^(?!.*secret-but-too-short).*$/);
  });
});
