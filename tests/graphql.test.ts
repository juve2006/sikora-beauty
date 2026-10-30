import { configToSchema } from '@payloadcms/graphql';
import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('DATABASE_URL', 'postgres://test:test@127.0.0.1:5999/none');
vi.stubEnv('PAYLOAD_SECRET', 'test-only-not-a-real-secret-0000000');

// Payload builds the GraphQL schema on the first request to `/api/graphql`; two types with one name
// break all of it, the admin's queries included, and no build or page shows it.
describe('the GraphQL schema', () => {
  it('builds, with no two types of one name', async () => {
    const config = await (await import('@/payload.config')).default;
    expect(() => configToSchema(config)).not.toThrow();
  });
});
