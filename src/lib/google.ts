import { createHash } from 'node:crypto';

import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/constants';
import { googleAnswer, googleIdentity } from '@/lib/validators';
import type { z } from 'zod';

// Signing in with Google, its code flow by hand (adr-20261104-google-sign-in). A shopper's way in only:
// staff sign in with a password.

export type GoogleIdentity = z.infer<typeof googleIdentity>;
type GoogleClient = { id: string; secret: string };

// Null where Google is not set up: locally and on a Preview, whose address it cannot know in advance.
export const googleClient = (): GoogleClient | null => {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
};

// `GOOGLE_STUB_URL` is for the e2e tests' stub only.
const at = (path: string, real: string) => {
  const stub = process.env.GOOGLE_STUB_URL;
  return stub ? new URL(path, stub).href : real;
};

const redirectUri = () =>
  new URL('/api/customers/google/callback', SITE_URL).href;

export const googleSignInUrl = (
  client: GoogleClient,
  state: string,
  verifier: string,
) => {
  const url = new URL(
    at('auth', 'https://accounts.google.com/o/oauth2/v2/auth'),
  );
  url.search = new URLSearchParams({
    client_id: client.id,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString();
  return url.href;
};

const claimsOf = (token: string): unknown => {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  } catch {
    return null;
  }
};

// The token comes straight from Google over TLS, so its signature needs no check; what it says does.
// A failure names no value: a shopper's data never reaches a log (RULES.md).
export async function readGoogleIdentity(
  client: GoogleClient,
  code: string,
  verifier: string,
) {
  const response = await fetch(
    at('token', 'https://oauth2.googleapis.com/token'),
    {
      method: 'POST',
      body: new URLSearchParams({
        code,
        client_id: client.id,
        client_secret: client.secret,
        code_verifier: verifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri(),
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) throw new Error(`token endpoint: ${response.status}`);
  const answer = googleAnswer.safeParse(await response.json());
  if (!answer.success) throw new Error('token endpoint: no id_token');
  const identity = googleIdentity.safeParse(claimsOf(answer.data.id_token));
  if (!identity.success) throw new Error('id_token: refused');
  if (identity.data.aud !== client.id) throw new Error('id_token: audience');
  if (identity.data.exp * 1000 <= Date.now())
    throw new Error('id_token: expired');
  return identity.data;
}

// Whether Google hosts the address, and so answers for who holds it today. For any other address
// `email_verified` says only that it was verified when the Google account was made, and it may have
// changed hands since: it may not open an account somebody already has.
export const googleOwnsAddress = ({ email, hd }: GoogleIdentity) =>
  email.endsWith('@gmail.com') || Boolean(hd);

// Only a path of this site, as the way back is a redirect: without its query, which the way back
// does not keep. `/.//elsewhere` is this site's until it is normalised, and then `//elsewhere` is
// another site's to a browser.
export const localPath = (from: unknown) => {
  if (typeof from !== 'string' || !from.startsWith('/')) return '/';
  const url = URL.parse(from, SITE_URL);
  return url?.origin === SITE_URL.origin && !url.pathname.startsWith('//')
    ? url.pathname
    : '/';
};

export const localeOf = (path: string) =>
  routing.locales.find(
    (locale) => path === `/${locale}` || path.startsWith(`/${locale}/`),
  ) ?? routing.defaultLocale;

const prefixOf = (path: string) => {
  const locale = localeOf(path);
  return locale === routing.defaultLocale ? '' : `/${locale}`;
};

export const accountPath = (path: string) => `${prefixOf(path)}/account`;

// The page it began on; from the account's own pages the home page, as their forms do.
export const landingPath = (path: string) => {
  const account = accountPath(path);
  return path === account || path.startsWith(`${account}/`)
    ? prefixOf(path) || '/'
    : path;
};
