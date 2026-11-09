import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import proxy, { config } from '@/proxy';

function get(path: string, headers: Record<string, string> = {}) {
  return proxy(new NextRequest(`http://localhost${path}`, { headers }));
}

const basic = (credentials: string) => ({
  authorization: `Basic ${btoa(credentials)}`,
});

describe('proxy', () => {
  it('serves / in Ukrainian to an English browser that visited /en before', async () => {
    const response = await get('/', {
      'accept-language': 'en-US,en;q=0.9',
      cookie: 'NEXT_LOCALE=en',
    });

    expect(response.headers.get('location')).toBeNull();
  });

  it('serves /en in English', async () => {
    const response = await get('/en');

    expect(response.headers.get('location')).toBeNull();
  });

  it('leaves /admin and /api to Payload', async () => {
    for (const path of ['/admin', '/api/users/me']) {
      expect((await get(path)).headers.get('x-middleware-next')).toBe('1');
    }
  });

  it('serves a page whose slug only starts like /admin or /api in Ukrainian', async () => {
    for (const path of ['/administratsiia', '/apiterapiia']) {
      const response = await get(path);
      expect(response.headers.get('x-middleware-rewrite'), path).toContain(
        `/uk${path}`,
      );
    }
  });
});

describe('the site password', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is asked on every path but Next internals', () => {
    const runs = (url: string) => unstable_doesMiddlewareMatch({ config, url });

    for (const url of [
      '/',
      '/en',
      '/admin',
      '/api/products',
      '/api/media/file/a.jpg',
      '/favicon.ico',
    ]) {
      expect(runs(url), url).toBe(true);
    }
    for (const url of [
      '/_next/static/chunks/app.js',
      '/_vercel/insights/script.js',
    ]) {
      expect(runs(url), url).toBe(false);
    }
  });

  it('asks every path for it', async () => {
    vi.stubEnv('SITE_PASSWORD', 'open-sesame-123');

    for (const path of [
      '/',
      '/en',
      '/admin',
      '/api/products',
      '/api/media/file/a.jpg',
    ]) {
      for (const headers of [
        {},
        basic('brother:wrong'),
        { authorization: 'Bearer open-sesame-123' },
      ]) {
        const response = await get(path, headers);
        expect(response.status).toBe(401);
        expect(response.headers.get('www-authenticate')).toBe(
          'Basic realm="Sikora Beauty"',
        );
      }
    }
  });

  // monobank's webhook carries its signature, not the password (src/lib/monobank.ts).
  it("lets only monobank's webhook and its reconciliation through without it", async () => {
    vi.stubEnv('SITE_PASSWORD', 'open-sesame-123');
    const send = (path: string, method: string) =>
      proxy(new NextRequest(`http://localhost${path}`, { method }));

    expect((await send('/api/mono/webhook', 'POST')).status).not.toBe(401);
    expect((await send('/api/mono/reconcile', 'GET')).status).not.toBe(401);
    for (const [path, method] of [
      ['/api/mono/webhook', 'GET'],
      ['/api/mono/webhook/', 'POST'],
      ['/api/mono', 'POST'],
      ['/en/api/mono/webhook', 'POST'],
      ['/api/mono/reconcile', 'POST'],
      ['/api/mono/reconcile/', 'GET'],
      ['/en/api/mono/reconcile', 'GET'],
      ['/api/orders', 'POST'],
    ])
      expect((await send(path, method)).status, `${method} ${path}`).toBe(401);
  });

  it('lets it through with any user name', async () => {
    vi.stubEnv('SITE_PASSWORD', 'open:sesame-123');

    expect((await get('/en', basic('yaryna:open:sesame-123'))).status).not.toBe(
      401,
    );
    expect(
      (await get('/admin', basic(':open:sesame-123'))).headers.get(
        'x-middleware-next',
      ),
    ).toBe('1');
  });
});
