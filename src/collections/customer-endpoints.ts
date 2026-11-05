import { randomBytes } from 'node:crypto';
import {
  commitTransaction,
  createLocalReq,
  type Endpoint,
  getFieldsToSign,
  initTransaction,
  jwtSign,
  killTransaction,
  type Payload,
  type TypedUser,
} from 'payload';
import {
  addSessionToUser,
  generatePayloadCookie,
  parseCookies,
} from 'payload/shared';

import {
  accountPath,
  type GoogleIdentity,
  googleClient,
  googleOwnsAddress,
  googleSignInUrl,
  landingPath,
  localeOf,
  localPath,
  readGoogleIdentity,
} from '@/lib/google';
import { whatFailed } from '@/lib/utils';
import { googleTrip } from '@/lib/validators';
import type { Customer } from '@/payload-types';

// A shopper's way in through Google (adr-20261104-google-sign-in): out to Google, and back to the
// session. Staff sign in with a password: this only ever gives a row of `customers`.

const COOKIE = 'google-sign-in';
const cookie = (value: string, maxAge: number) =>
  `${COOKIE}=${value}; Path=/api/customers/google; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
const CLEAR = cookie('', 0);

const go = (location: string, ...cookies: string[]) => {
  const headers = new Headers({ Location: location });
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(null, { status: 302, headers });
};

// The cookie is not signed, so its way back is checked again as the query's was.
const tripOf = (value: string | undefined) => {
  try {
    const trip = googleTrip.parse(
      JSON.parse(Buffer.from(String(value), 'base64url').toString()),
    );
    return { ...trip, from: localPath(trip.from) };
  } catch {
    return null;
  }
};

const nameOf = (value: string | undefined) =>
  value?.trim().slice(0, 50) || undefined;

// The password is one nobody knows, so every row has a `hash` and `auth-writes` guards it as any other;
// a reset letter gives the shopper their own. `create` leaves a token even on a confirmed row: with it, a
// row the owner then unticks would read as one waiting for a letter, which anyone may replace.
const createAccount = async (
  payload: Payload,
  identity: GoogleIdentity,
  locale: Customer['locale'],
) => {
  const { id } = await payload.create({
    collection: 'customers',
    data: {
      email: identity.email,
      firstName: nameOf(identity.given_name),
      lastName: nameOf(identity.family_name),
      googleId: identity.sub,
      locale,
      password: randomBytes(32).toString('hex'),
      _verified: true,
    },
    disableVerificationEmail: true,
  });
  await payload.db.updateOne({
    collection: 'customers',
    data: { _verificationToken: null, updatedAt: new Date().toISOString() },
    options: { atomic: true },
    where: { id: { equals: id } },
  });
  return id;
};

// Whose account this is, by Google's `sub`, then by the address where it may decide. A row waiting
// for its letter holds nothing: nobody signed in to it, so it has no session and no order, and what is
// in it, its number too, may be a stranger's who registered this address. Unticked by the owner, or
// another Google account's: refused.
const accountFor = async (
  payload: Payload,
  identity: GoogleIdentity,
  locale: Customer['locale'],
): Promise<number | 'failed' | 'usePassword'> => {
  const known = await payload.db.findOne<Customer>({
    collection: 'customers',
    where: { googleId: { equals: identity.sub } },
  });
  if (known) return known._verified ? known.id : 'failed';
  const holder = await payload.db.findOne<Customer>({
    collection: 'customers',
    where: { email: { equals: identity.email } },
  });
  if (!holder) return createAccount(payload, identity, locale);
  const waiting = !holder._verified && Boolean(holder._verificationToken);
  if (holder.googleId || (!holder._verified && !waiting)) return 'failed';
  if (!googleOwnsAddress(identity)) return 'usePassword';
  if (waiting) {
    await payload.delete({
      collection: 'customers',
      where: {
        and: [
          { id: { equals: holder.id } },
          { _verified: { equals: false } },
          { _verificationToken: { exists: true } },
        ],
      },
    });
    return createAccount(payload, identity, locale);
  }
  const linked = await payload.db.updateOne({
    collection: 'customers',
    data: { googleId: identity.sub, updatedAt: new Date().toISOString() },
    options: { atomic: true },
    where: {
      and: [
        { id: { equals: holder.id } },
        { googleId: { exists: false } },
        { _verified: { equals: true } },
      ],
    },
  });
  return linked ? holder.id : 'failed';
};

// What `loginOperation` does once the password is right. The lock is not asked: it stops guessing a
// password, and someone who locked this account on purpose must not keep its holder out of Google's
// way in too. The mark is `markAccessWrites`' at a sign-in: without it `auth-writes` drops the session.
// A Payload upgrade reads `login.js` against this too.
const openSession = async (payload: Payload, id: number) => {
  const { config } = payload.collections.customers;
  const user = await payload.db.findOne<Customer>({
    collection: 'customers',
    where: { id: { equals: id } },
  });
  if (!user) throw new Error('the account is gone');
  const req = await createLocalReq({}, payload);
  req.context.sessionWrite = 'adds';
  await initTransaction(req);
  try {
    const { sid } = await addSessionToUser({
      collectionConfig: config,
      payload,
      req,
      user: user as unknown as TypedUser,
    });
    const { token } = await jwtSign({
      fieldsToSign: getFieldsToSign({
        collectionConfig: config,
        email: user.email,
        sid,
        user: user as unknown as TypedUser,
      }),
      secret: payload.secret,
      tokenExpiration: config.auth.tokenExpiration,
    });
    await commitTransaction(req);
    return generatePayloadCookie({
      collectionAuthConfig: config.auth,
      cookiePrefix: payload.config.cookiePrefix,
      token,
    });
  } catch (error) {
    await killTransaction(req);
    throw error;
  }
};

export const customerEndpoints: Endpoint[] = [
  {
    path: '/google',
    method: 'get',
    handler: (req) => {
      const from = localPath(req.searchParams.get('from'));
      const client = googleClient();
      if (!client) return go(`${accountPath(from)}?google=unavailable`);
      const state = randomBytes(24).toString('base64url');
      const verifier = randomBytes(48).toString('base64url');
      return go(
        googleSignInUrl(client, state, verifier),
        cookie(
          Buffer.from(JSON.stringify({ state, verifier, from })).toString(
            'base64url',
          ),
          600,
        ),
      );
    },
  },
  {
    // A GET, as Google answers with one, and the one that changes an account (RULES.md): nothing happens
    // without the cookie this browser got on leaving for Google, so a scanner opening the link does nothing.
    path: '/google/callback',
    method: 'get',
    handler: async (req) => {
      const query = req.searchParams;
      const trip = tripOf(parseCookies(req.headers).get(COOKIE));
      const client = googleClient();
      if (!client || !trip || trip.state !== query.get('state'))
        return go(`${accountPath(trip?.from ?? '/')}?google=failed`, CLEAR);
      const { from, verifier } = trip;
      const refused = (reason: 'failed' | 'usePassword') =>
        go(`${accountPath(from)}?google=${reason}`, CLEAR);
      if (query.get('error') === 'access_denied') return go(from, CLEAR);
      const code = query.get('code');
      if (!code) return refused('failed');
      try {
        const identity = await readGoogleIdentity(client, code, verifier);
        const account = await accountFor(req.payload, identity, localeOf(from));
        if (typeof account === 'string') return refused(account);
        return go(
          landingPath(from),
          CLEAR,
          await openSession(req.payload, account),
        );
      } catch (error) {
        console.error('Google sign-in:', whatFailed(error));
        return refused('failed');
      }
    },
  },
];
