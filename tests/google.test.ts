import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PayloadRequest } from 'payload';

import { customerEndpoints } from '@/collections/customer-endpoints';
import {
  accountPath,
  googleOwnsAddress,
  googleSignInUrl,
  landingPath,
  localeOf,
  localPath,
  readGoogleIdentity,
} from '@/lib/google';
import { googleIdentity, googleRefusal } from '@/lib/validators';

const client = { id: 'client', secret: 'secret' };
const claims = {
  iss: 'https://accounts.google.com',
  aud: 'client',
  exp: Math.floor(Date.now() / 1000) + 60,
  sub: '42',
  email: 'Olena@Gmail.com',
  email_verified: true,
};
const token = (body: object) =>
  ['{}', JSON.stringify(body), '']
    .map((part) => Buffer.from(part).toString('base64url'))
    .join('.');
const answering = (body: object, status = 200) =>
  vi.stubGlobal('fetch', async () => Response.json(body, { status }));

const start = customerEndpoints.find(({ path }) => path === '/google')!;
const callback = customerEndpoints.find(
  ({ path }) => path === '/google/callback',
)!;
const request = (query = '', cookie = '') =>
  ({
    searchParams: new URLSearchParams(query),
    headers: new Headers({ cookie }),
  }) as unknown as PayloadRequest;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the way back', () => {
  it('takes only a path of this site, without its query', () => {
    expect(localPath('/en/brands')).toBe('/en/brands');
    expect(localPath('/catalog?type=dry')).toBe('/catalog');
    for (const from of [
      '//elsewhere.example/x',
      '/\\elsewhere.example/x',
      '/.//elsewhere.example/x',
      '/..//elsewhere.example/x',
      '/brands/..//elsewhere.example/x',
      '/.\\/elsewhere.example/x',
      '/.///elsewhere.example/x',
      '/%2e//elsewhere.example/x',
      '//',
      'https://elsewhere.example/x',
      'javascript:alert(1)',
      '',
      null,
    ])
      expect(localPath(from)).toBe('/');
    expect(localPath('/brands//x')).toBe('/brands//x');
  });

  it('knows the language by the path', () => {
    expect(localeOf('/en')).toBe('en');
    expect(localeOf('/en/brands')).toBe('en');
    expect(localeOf('/english')).toBe('uk');
    expect(accountPath('/brands')).toBe('/account');
    expect(accountPath('/en/brands')).toBe('/en/account');
  });

  it('stays on the page, and from the account’s own pages goes home', () => {
    expect(landingPath('/brands')).toBe('/brands');
    expect(landingPath('/account')).toBe('/');
    expect(landingPath('/account/verify')).toBe('/');
    expect(landingPath('/en/account')).toBe('/en');
    expect(landingPath('/accounting')).toBe('/accounting');
    expect(landingPath('/product/account')).toBe('/product/account');
  });
});

describe('what Google says', () => {
  it('asks for nothing but who this is, with PKCE', () => {
    const url = new URL(googleSignInUrl(client, 'state', 'verifier'));
    expect(url.origin + url.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      scope: 'openid email profile',
      state: 'state',
      code_challenge_method: 'S256',
      redirect_uri: expect.stringMatching(
        /\/api\/customers\/google\/callback$/,
      ),
    });
    expect(url.searchParams.get('code_challenge')).not.toContain('verifier');
  });

  it('reads the person from the token', async () => {
    answering({ id_token: token(claims) });
    expect(await readGoogleIdentity(client, 'code', 'verifier')).toMatchObject({
      sub: '42',
      email: 'olena@gmail.com',
    });
  });

  it('refuses what is not for this client, is out of date or is not verified', async () => {
    for (const change of [
      { aud: 'another' },
      { exp: 1 },
      { iss: 'https://elsewhere.example' },
      { email_verified: false },
      { sub: '' },
      { email: 'no address' },
    ]) {
      answering({ id_token: token({ ...claims, ...change }) });
      await expect(
        readGoogleIdentity(client, 'code', 'verifier'),
      ).rejects.toThrow('id_token');
    }
  });

  it('refuses a token it cannot read and a failing endpoint, naming no value', async () => {
    answering({ id_token: 'not-a-token' });
    await expect(readGoogleIdentity(client, 'c', 'v')).rejects.toThrow(
      /^id_token: refused$/,
    );
    answering({});
    await expect(readGoogleIdentity(client, 'c', 'v')).rejects.toThrow(
      /^token endpoint: no id_token$/,
    );
    answering({ error: 'invalid_grant' }, 400);
    await expect(readGoogleIdentity(client, 'c', 'v')).rejects.toThrow(
      /^token endpoint: 400$/,
    );
  });

  it('answers for an address only where it hosts it', () => {
    const identity = googleIdentity.parse(claims);
    expect(googleOwnsAddress(identity)).toBe(true);
    expect(googleOwnsAddress({ ...identity, email: 'a@ukr.net' })).toBe(false);
    expect(
      googleOwnsAddress({ ...identity, email: 'a@firm.ua', hd: 'firm.ua' }),
    ).toBe(true);
    expect(
      googleOwnsAddress({
        ...identity,
        email: 'a@gmail.com.elsewhere.example',
      }),
    ).toBe(false);
  });
});

describe('the endpoints', () => {
  it('without keys says so, in the page’s language', async () => {
    const answer = await start.handler(request('from=/en/brands'));
    expect(answer.status).toBe(302);
    expect(answer.headers.get('location')).toBe(
      '/en/account?google=unavailable',
    );
    expect(answer.headers.get('set-cookie')).toBeNull();
  });

  it('with keys leaves for Google with a cookie this browser alone has', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'client');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret');
    const answer = await start.handler(request('from=/brands'));
    expect(answer.headers.get('location')).toContain('accounts.google.com');
    expect(answer.headers.get('set-cookie')).toMatch(
      /^google-sign-in=[\w-]+; Path=\/api\/customers\/google; Max-Age=600; HttpOnly; SameSite=Lax/,
    );
  });

  it('asks Google nothing without that cookie, or with another state', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'client');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const trip = Buffer.from(
      JSON.stringify({ state: 'mine', verifier: 'v', from: '/en/brands' }),
    ).toString('base64url');
    for (const [query, cookie, location] of [
      ['code=a&state=mine', '', '/account?google=failed'],
      ['code=a&state=mine', 'google-sign-in=broken', '/account?google=failed'],
      [
        'code=a&state=other',
        `google-sign-in=${trip}`,
        '/en/account?google=failed',
      ],
    ]) {
      const answer = await callback.handler(request(query, cookie));
      expect(answer.headers.get('location')).toBe(location);
      expect(answer.headers.get('set-cookie')).toContain('Max-Age=0');
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  const declinedFrom = async (from: string) => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'client');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret');
    const trip = Buffer.from(
      JSON.stringify({ state: 'mine', verifier: 'v', from }),
    ).toString('base64url');
    const answer = await callback.handler(
      request('error=access_denied&state=mine', `google-sign-in=${trip}`),
    );
    return answer.headers.get('location');
  };

  it('a cancel comes back to the page it left, the account’s own too', async () => {
    expect(await declinedFrom('/brands')).toBe('/brands');
    expect(await declinedFrom('/account')).toBe('/account');
    expect(await declinedFrom('/en/account')).toBe('/en/account');
  });

  it('takes the way back from its cookie only as a path of this site', async () => {
    expect(await declinedFrom('https://elsewhere.example/x')).toBe('/');
    expect(await declinedFrom('//elsewhere.example/x')).toBe('/');
    expect(await declinedFrom('/.//elsewhere.example/x')).toBe('/');
  });

  it('logs what failed and nothing a shopper wrote', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'client');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret');
    answering({ error: 'olena@gmail.com' }, 500);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const trip = Buffer.from(
      JSON.stringify({ state: 'mine', verifier: 'v', from: '/brands' }),
    ).toString('base64url');
    const answer = await callback.handler(
      request('code=a&state=mine', `google-sign-in=${trip}`),
    );
    expect(answer.headers.get('location')).toBe('/account?google=failed');
    expect(error).toHaveBeenCalledWith(
      'Google sign-in:',
      'token endpoint: 500',
    );
  });
});

describe('a refusal on the account page', () => {
  it('is one of three, or nothing', () => {
    expect(googleRefusal.parse('usePassword')).toBe('usePassword');
    expect(googleRefusal.parse(['failed', 'x'])).toBe('failed');
    expect(googleRefusal.parse('<script>')).toBeUndefined();
    expect(googleRefusal.parse(undefined)).toBeUndefined();
  });
});
