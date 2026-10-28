import { describe, expect, it } from 'vitest'

import { parseEnv } from './env'

const valid = {
  DATABASE_URL: 'postgres://user:secret-password@127.0.0.1:5432/sikora',
  PAYLOAD_SECRET: 'x'.repeat(32),
}

describe('parseEnv', () => {
  it('accepts a complete environment', () => {
    expect(parseEnv(valid)).toEqual(valid)
  })

  it('names every missing or malformed variable', () => {
    expect(() => parseEnv({ PAYLOAD_SECRET: 'short' })).toThrow(
      'Invalid environment variables: DATABASE_URL, PAYLOAD_SECRET',
    )
  })

  it('needs the Blob token on Vercel only', () => {
    expect(() => parseEnv({ ...valid, VERCEL: '1' })).toThrow(
      'Invalid environment variables: BLOB_READ_WRITE_TOKEN',
    )
    expect(parseEnv({ ...valid, VERCEL: '1', BLOB_READ_WRITE_TOKEN: 'token' }).BLOB_READ_WRITE_TOKEN).toBe(
      'token',
    )
  })

  it('never puts a value into the error', () => {
    const leaky = { ...valid, PAYLOAD_SECRET: 'secret-but-too-short' }
    expect(() => parseEnv(leaky)).toThrow(/^(?!.*secret-but-too-short).*$/)
  })
})
