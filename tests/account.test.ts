import { nodemailerAdapter } from '@payloadcms/email-nodemailer';
import { AuthenticationError, LockedAuth, UnverifiedEmail } from 'payload';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  register,
  requestReset,
  resendVerification,
  resetPassword,
  signIn,
  signOut,
  updateProfile,
} from '@/lib/actions/account.actions';
import { myOrders, waitingToken } from '@/lib/actions/customer.actions';
import {
  CUSTOMER_SESSION_SECONDS,
  CUSTOMER_ORDERS,
  LETTER_INTERVAL,
} from '@/lib/constants';
import {
  emailAdapter,
  resetLetter,
  staffResetLetter,
  verifyLetter,
} from '@/lib/email';
import { Customers } from '@/collections/customers';
import { Users } from '@/collections/users';
import {
  accountToken,
  parseAccountForm,
  passwordReset,
  profileUpdate,
  registerRequest,
  signInRequest,
} from '@/lib/validators';

vi.mock('server-only', () => ({}));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('@payloadcms/email-nodemailer', async (original) => {
  const actual =
    await original<typeof import('@payloadcms/email-nodemailer')>();
  return { ...actual, nodemailerAdapter: vi.fn(actual.nodemailerAdapter) };
});

const auth = (tokenExpiration: number) => ({
  tokenExpiration,
  cookies: { sameSite: 'Lax', secure: true },
});
const payload = {
  auth: vi.fn(),
  config: { cookiePrefix: 'payload' },
  collections: {
    users: { config: { auth: auth(7200) } },
    customers: { config: { auth: auth(CUSTOMER_SESSION_SECONDS) } },
  },
  db: { findOne: vi.fn(), updateOne: vi.fn() },
  find: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  sendEmail: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
};
const login = vi.fn();
const commit = vi.fn();
const kill = vi.fn();
vi.mock('payload', async (original) => ({
  ...(await original<typeof import('payload')>()),
  getPayload: async () => payload,
  createLocalReq: async () => ({}),
  initTransaction: async () => true,
  commitTransaction: (req: unknown) => commit(req),
  killTransaction: (req: unknown) => kill(req),
  loginOperation: (args: unknown) => login(args),
}));
const set = vi.fn();
vi.mock('next/headers', () => ({
  cookies: async () => ({ set }),
  headers: async () => new Headers(),
}));
const logout = vi.fn();
vi.mock('@payloadcms/next/auth', () => ({
  logout: (args: unknown) => logout(args),
}));
const later: (() => Promise<unknown>)[] = [];
vi.mock('next/server', async (original) => ({
  ...(await original<typeof import('next/server')>()),
  after: (task: () => Promise<unknown>) => later.push(task),
}));
const afterTheAnswer = () => Promise.all(later.splice(0).map((task) => task()));

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
  return data;
};
const idle = { status: 'idle' } as const;
const t = ((key: string) => key) as never;
const email = 'olena@example.com';
const credentials = { email, password: 'correct horse' };
const filled = {
  firstName: 'Олена',
  lastName: 'Тестова',
  ...credentials,
  locale: 'en',
};
const account = {
  firstName: 'Олена',
  lastName: 'Тестова',
  email,
  password: 'correct horse',
  locale: 'en',
};
const shopper = { id: 5, collection: 'customers', email };

beforeEach(() => {
  vi.resetAllMocks();
  later.length = 0;
  payload.find.mockResolvedValue({ docs: [] });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the account schemas', () => {
  it('keeps an email lowercase and trimmed', () => {
    expect(
      parseAccountForm(
        signInRequest,
        form({ email: ' Olena@Example.COM ', password: 'x' }),
      ).data?.email,
    ).toBe(email);
  });

  it('names what is wrong by its message keys', () => {
    expect(
      parseAccountForm(
        registerRequest,
        form({
          firstName: ' ',
          lastName: 'x'.repeat(51),
          email: 'not-an-email',
          password: 'short',
        }),
      ).errors,
    ).toEqual({
      firstName: ['required'],
      lastName: ['long'],
      email: ['emailInvalid'],
      password: ['passwordShort'],
    });
    expect(
      parseAccountForm(signInRequest, form({ email, password: '' })).errors,
    ).toEqual({ password: ['required'] });
  });

  it('takes no password of spaces, which Payload would never sign in', () => {
    expect(
      parseAccountForm(
        registerRequest,
        form({ ...account, password: ' '.repeat(8) }),
      ).errors,
    ).toEqual({ password: ['passwordShort'] });
    expect(
      parseAccountForm(signInRequest, form({ email, password: ' '.repeat(8) }))
        .errors,
    ).toEqual({ password: ['required'] });
    // A password's own spaces stay.
    expect(
      parseAccountForm(
        registerRequest,
        form({ ...account, password: ' a good one ' }),
      ).data?.password,
    ).toBe(' a good one ');
  });

  it('caps a password at what a hash is worth computing for', () => {
    const password = 'x'.repeat(201);
    expect(
      parseAccountForm(signInRequest, form({ email, password })).errors,
    ).toEqual({ password: ['long'] });
    expect(
      parseAccountForm(registerRequest, form({ ...account, password })).errors,
    ).toEqual({ password: ['long'] });
  });

  it("takes Turnstile's own field as the token and a bad language as the default", () => {
    expect(
      parseAccountForm(
        registerRequest,
        form({
          ...account,
          locale: 'de',
          'cf-turnstile-response': 'turnstile',
        }),
      ).data,
    ).toEqual({ ...account, locale: 'uk', token: 'turnstile' });
  });

  it('reads a letter’s token, the first if repeated, and nothing else', () => {
    const token = 'a1'.repeat(20);
    expect(accountToken.parse(token)).toBe(token);
    expect(accountToken.parse([token, 'x'])).toBe(token);
    for (const bad of ['', 'xyz', 'A1'.repeat(20), undefined])
      expect(accountToken.safeParse(bad).success).toBe(false);
  });

  it('needs a good new password with its token', () => {
    expect(
      parseAccountForm(
        passwordReset,
        form({ token: 'nope', password: 'short' }),
      ).errors,
    ).toEqual({ token: expect.any(Array), password: ['passwordShort'] });
  });

  it('keeps a phone as +380…, and clearing it clears it', () => {
    const profile = { firstName: 'Олена', lastName: 'Тестова' };
    expect(
      parseAccountForm(
        profileUpdate,
        form({ ...profile, phone: '067 123 45 67' }),
      ).data,
    ).toEqual({ ...profile, phone: '+380671234567' });
    expect(
      parseAccountForm(profileUpdate, form({ ...profile, phone: '' })).data,
    ).toEqual({ ...profile, phone: null });
    expect(
      parseAccountForm(profileUpdate, form({ ...profile, phone: '123' }))
        .errors,
    ).toEqual({ phone: ['phoneInvalid'] });
  });
});

describe('signIn', () => {
  const succeedsFor = (slug: string) =>
    login.mockImplementation(async ({ collection }) => {
      if (collection !== payload.collections[slug as 'users'])
        throw new AuthenticationError(t);
      return { token: 'jwt' };
    });

  it('takes staff to the admin, with their own session', async () => {
    succeedsFor('users');
    expect(await signIn(idle, form(credentials))).toEqual({ status: 'staff' });
    expect(login).toHaveBeenCalledOnce();
    const cookie = set.mock.calls[0][0];
    const seconds = (cookie.expires.getTime() - Date.now()) / 1000;
    expect(seconds).toBeGreaterThan(7190);
    expect(seconds).toBeLessThanOrEqual(7200);
  });

  it('takes a shopper to their account, for a month', async () => {
    succeedsFor('customers');
    expect(await signIn(idle, form(credentials))).toEqual({
      status: 'customer',
    });
    const cookie = set.mock.calls[0][0];
    expect(cookie).toMatchObject({
      name: 'payload-token',
      value: 'jwt',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
    const days =
      (cookie.expires.getTime() - Date.now()) / 1000 / (24 * 60 * 60);
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
  });

  it('asks staff first, so a password that matches both signs in as staff', async () => {
    login.mockResolvedValue({ token: 'jwt' });
    expect(await signIn(idle, form(credentials))).toEqual({ status: 'staff' });
    expect(login.mock.calls[0][0].collection).toBe(payload.collections.users);
  });

  it('says the same for an unknown email and a wrong password', async () => {
    login.mockRejectedValue(new AuthenticationError(t));
    expect(await signIn(idle, form(credentials))).toEqual({ status: 'wrong' });
    expect(set).not.toHaveBeenCalled();
  });

  it('says when the attempts ran out', async () => {
    login.mockImplementation(async ({ collection }) => {
      throw collection === payload.collections.customers
        ? new LockedAuth(t)
        : new AuthenticationError(t);
    });
    expect(await signIn(idle, form(credentials))).toEqual({ status: 'locked' });
  });

  it('offers the letter again to an account not confirmed, even with a locked twin on staff', async () => {
    login.mockImplementation(async ({ collection }) => {
      throw collection === payload.collections.customers
        ? new UnverifiedEmail({ t })
        : new LockedAuth(t);
    });
    expect(await signIn(idle, form(credentials))).toEqual({
      status: 'unverified',
      email,
    });
  });

  describe('with a letter’s token', () => {
    const token = 'a1'.repeat(20);
    const withLetter = form({ ...credentials, token });
    const waiting = { id: 5, hash: 'the-hash', _verificationToken: token };
    const unverifiedThenSignedIn = () =>
      login.mockImplementation(async ({ collection }) => {
        if (collection === payload.collections.users)
          throw new AuthenticationError(t);
        if (payload.db.updateOne.mock.calls.length === 0)
          throw new UnverifiedEmail({ t });
        return { token: 'jwt' };
      });

    it('confirms the email with the right password, and signs in', async () => {
      unverifiedThenSignedIn();
      payload.db.findOne.mockResolvedValue(waiting);
      payload.db.updateOne.mockResolvedValue(waiting);
      expect(await signIn(idle, withLetter)).toEqual({ status: 'customer' });
      expect(payload.db.findOne).toHaveBeenCalledWith({
        collection: 'customers',
        where: {
          and: [
            { email: { equals: email } },
            { _verificationToken: { equals: token } },
          ],
        },
      });
      expect(payload.db.updateOne).toHaveBeenCalledOnce();
      expect(payload.db.updateOne).toHaveBeenCalledWith({
        collection: 'customers',
        data: {
          _verified: true,
          _verificationToken: null,
          updatedAt: expect.any(String),
        },
        options: { atomic: true },
        where: {
          and: [
            { id: { equals: 5 } },
            { hash: { equals: 'the-hash' } },
            { _verificationToken: { equals: token } },
          ],
        },
      });
      expect(set).toHaveBeenCalledOnce();
    });

    it('reads the password’s hash before the password is checked', async () => {
      unverifiedThenSignedIn();
      payload.db.findOne.mockResolvedValue(waiting);
      payload.db.updateOne.mockResolvedValue(waiting);
      await signIn(idle, withLetter);
      expect(payload.db.findOne.mock.invocationCallOrder[0]).toBeLessThan(
        login.mock.invocationCallOrder[0],
      );
    });

    it('confirms nothing when the password was replaced meanwhile', async () => {
      unverifiedThenSignedIn();
      payload.db.findOne.mockResolvedValue(waiting);
      payload.db.updateOne.mockResolvedValue(null);
      expect(await signIn(idle, withLetter)).toEqual({
        status: 'unverified',
        email,
      });
      expect(set).not.toHaveBeenCalled();
    });

    it('confirms nothing with a wrong password', async () => {
      login.mockRejectedValue(new AuthenticationError(t));
      payload.db.findOne.mockResolvedValue(waiting);
      expect(await signIn(idle, withLetter)).toEqual({ status: 'wrong' });
      expect(payload.db.updateOne).not.toHaveBeenCalled();
      expect(set).not.toHaveBeenCalled();
    });

    it('confirms nothing with a token that is not this account’s', async () => {
      unverifiedThenSignedIn();
      payload.db.findOne.mockResolvedValue(null);
      expect(await signIn(idle, withLetter)).toEqual({
        status: 'unverified',
        email,
      });
      expect(payload.db.updateOne).not.toHaveBeenCalled();
      expect(set).not.toHaveBeenCalled();
    });

    it('confirms nothing without a token', async () => {
      unverifiedThenSignedIn();
      expect(await signIn(idle, form(credentials))).toEqual({
        status: 'unverified',
        email,
      });
      expect(payload.db.findOne).not.toHaveBeenCalled();
      expect(payload.db.updateOne).not.toHaveBeenCalled();
    });

    it('takes a forged token as none', async () => {
      unverifiedThenSignedIn();
      expect(
        await signIn(idle, form({ ...credentials, token: "' or 1=1" })),
      ).toEqual({ status: 'unverified', email });
      expect(payload.db.findOne).not.toHaveBeenCalled();
    });
  });

  it('checks the fields before the database', async () => {
    expect(await signIn(idle, form({ email: 'x', password: 'y' }))).toEqual({
      status: 'invalid',
      errors: { email: ['emailInvalid'] },
    });
    expect(login).not.toHaveBeenCalled();
  });

  it('answers «failed» to anything else, and logs nothing of the shopper', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    login.mockRejectedValue(new Error(`Failed query: params: ${email}`));
    expect(await signIn(idle, form(credentials))).toEqual({ status: 'failed' });
    expect(log).toHaveBeenCalledOnce();
    // The first line of a query's failure, as `placeOrder` logs it, has the query.
    login.mockRejectedValue(
      Object.assign(new Error(`SELECT ${email}`), {
        cause: { message: 'connection refused' },
      }),
    );
    await signIn(idle, form(credentials));
    expect(log.mock.calls[1].join(' ')).not.toContain(email);
  });
});

describe('register', () => {
  it('creates the account, whose creation sends the letter', async () => {
    expect(await register(idle, form(filled))).toEqual({
      status: 'sent',
      email,
    });
    expect(payload.create).toHaveBeenCalledWith({
      collection: 'customers',
      data: account,
    });
    expect(payload.sendEmail).not.toHaveBeenCalled();
  });

  it('says a confirmed email is taken, and changes nothing', async () => {
    payload.find.mockResolvedValue({ docs: [{ id: 5, _verified: true }] });
    expect(await register(idle, form(filled))).toEqual({
      status: 'invalid',
      errors: { email: ['taken'] },
    });
    expect(payload.create).not.toHaveBeenCalled();
    expect(payload.update).not.toHaveBeenCalled();
    expect(payload.sendEmail).not.toHaveBeenCalled();
  });

  describe('an email nobody confirmed', () => {
    const token = 'a1'.repeat(20);
    beforeEach(() => {
      payload.find.mockResolvedValue({
        docs: [
          {
            id: 5,
            email,
            locale: 'uk',
            _verified: false,
            _verificationToken: token,
          },
        ],
      });
    });

    it('replaces the password while holding the row, and sends the letter again', async () => {
      payload.db.updateOne.mockResolvedValue({ id: 5 });
      expect(await register(idle, form(filled))).toEqual({
        status: 'sent',
        email,
      });
      const [held] = payload.db.updateOne.mock.calls[0];
      expect(held).toMatchObject({
        collection: 'customers',
        options: { atomic: true },
        where: {
          and: [
            { id: { equals: 5 } },
            { _verified: { equals: false } },
            { _verificationToken: { exists: true } },
          ],
        },
      });
      expect(payload.update).toHaveBeenCalledWith({
        collection: 'customers',
        id: 5,
        data: account,
        req: held.req,
      });
      expect(commit).toHaveBeenCalledWith(held.req);
      expect(kill).not.toHaveBeenCalled();
      const [holding, booking] = payload.db.updateOne.mock.invocationCallOrder;
      const [writing] = payload.update.mock.invocationCallOrder;
      const [committing] = commit.mock.invocationCallOrder;
      expect(holding).toBeLessThan(writing);
      expect(writing).toBeLessThan(committing);
      expect(committing).toBeLessThan(booking);
      expect(payload.create).not.toHaveBeenCalled();
      expect(payload.sendEmail).toHaveBeenCalledWith({
        to: email,
        ...verifyLetter(token, 'en'),
      });
    });

    it('says it is taken, and writes nothing, if the owner confirmed meanwhile', async () => {
      payload.db.updateOne.mockResolvedValue(null);
      expect(await register(idle, form(filled))).toEqual({
        status: 'invalid',
        errors: { email: ['taken'] },
      });
      expect(payload.update).not.toHaveBeenCalled();
      expect(payload.sendEmail).not.toHaveBeenCalled();
      expect(commit).toHaveBeenCalledOnce();
    });

    it('gives the row back when the password is not written', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      payload.db.updateOne.mockResolvedValue({ id: 5 });
      payload.update.mockRejectedValue(new Error('refused'));
      expect(await register(idle, form(filled))).toEqual({ status: 'failed' });
      expect(kill).toHaveBeenCalledOnce();
      expect(commit).not.toHaveBeenCalled();
      expect(payload.sendEmail).not.toHaveBeenCalled();
    });

    it('replaces the password but sends no letter inside the interval', async () => {
      payload.db.updateOne
        .mockResolvedValueOnce({ id: 5 })
        .mockResolvedValueOnce(null);
      expect(await register(idle, form(filled))).toEqual({
        status: 'sent',
        email,
      });
      expect(payload.update).toHaveBeenCalledOnce();
      expect(payload.sendEmail).not.toHaveBeenCalled();
    });
  });

  it('creates nothing when Turnstile refuses', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: false })),
    );
    expect(
      await register(idle, form({ ...filled, 'cf-turnstile-response': 'x' })),
    ).toEqual({ status: 'failed' });
    expect(payload.find).not.toHaveBeenCalled();
    expect(payload.create).not.toHaveBeenCalled();
  });

  it('answers «failed» when the letter fails, and logs no address', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    payload.create.mockRejectedValue(
      Object.assign(new Error(`All recipients rejected: ${email}`), {
        code: 'EENVELOPE',
      }),
    );
    expect(await register(idle, form(filled))).toEqual({ status: 'failed' });
    expect(log).toHaveBeenCalledWith('Account registration:', 'EENVELOPE');
  });
});

describe('resendVerification', () => {
  const token = 'b2'.repeat(20);
  const waiting = {
    id: 5,
    email,
    locale: 'uk',
    _verified: false,
    _verificationToken: token,
  };
  const ago = (milliseconds: number) =>
    new Date(Date.now() - milliseconds).toISOString();

  it('books the interval in one statement, then sends the letter', async () => {
    payload.find.mockResolvedValue({ docs: [waiting] });
    payload.db.updateOne.mockResolvedValue({ id: 5 });
    expect(await resendVerification(idle, form({ email }))).toEqual({
      status: 'sent',
      email,
    });
    expect(payload.db.updateOne).toHaveBeenCalledOnce();
    const [{ data, options, where }] = payload.db.updateOne.mock.calls[0];
    const since = new Date(
      new Date(data.verificationSentAt).getTime() - LETTER_INTERVAL,
    ).toISOString();
    expect(options).toEqual({ atomic: true });
    expect(where).toEqual({
      and: [
        { id: { equals: 5 } },
        {
          or: [
            { verificationSentAt: { less_than_equal: since } },
            {
              and: [
                { verificationSentAt: { exists: false } },
                { createdAt: { less_than_equal: since } },
              ],
            },
          ],
        },
      ],
    });
    expect(payload.sendEmail).toHaveBeenCalledWith({
      to: email,
      ...verifyLetter(token, 'uk'),
    });
    expect(payload.update).not.toHaveBeenCalled();
  });

  it('answers the same but sends nothing while the interval is booked', async () => {
    payload.find.mockResolvedValue({ docs: [waiting] });
    payload.db.updateOne.mockResolvedValue(null);
    expect(await resendVerification(idle, form({ email }))).toEqual({
      status: 'sent',
      email,
    });
    expect(payload.sendEmail).not.toHaveBeenCalled();
  });

  it('gives the interval back when the letter fails, so it can go again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const before = ago(LETTER_INTERVAL + 1000);
    payload.find.mockResolvedValue({
      docs: [{ ...waiting, verificationSentAt: before }],
    });
    payload.db.updateOne.mockResolvedValue({ id: 5 });
    payload.sendEmail.mockRejectedValue(new Error('refused'));
    expect(await resendVerification(idle, form({ email }))).toEqual({
      status: 'failed',
    });
    const [[booking], [release]] = payload.db.updateOne.mock.calls;
    expect(release).toEqual({
      collection: 'customers',
      data: { verificationSentAt: before },
      options: { atomic: true },
      where: {
        and: [
          { id: { equals: 5 } },
          {
            verificationSentAt: {
              equals: booking.data.verificationSentAt,
            },
          },
        ],
      },
    });
  });

  it('sends no dead link: an account with no token gets no letter', async () => {
    payload.find.mockResolvedValue({
      docs: [{ ...waiting, _verificationToken: null }],
    });
    expect(await resendVerification(idle, form({ email }))).toEqual({
      status: 'sent',
      email,
    });
    expect(payload.db.updateOne).not.toHaveBeenCalled();
    expect(payload.sendEmail).not.toHaveBeenCalled();
  });

  it.each([
    ['no account', []],
    ['a confirmed account', [{ email, _verified: true }]],
  ])('answers the same to %s, and sends nothing', async (_, docs) => {
    payload.find.mockResolvedValue({ docs });
    expect(await resendVerification(idle, form({ email }))).toEqual({
      status: 'sent',
      email,
    });
    expect(payload.sendEmail).not.toHaveBeenCalled();
  });
});

describe('requestReset', () => {
  it('asks both collections after the answer, whatever they find', async () => {
    expect(await requestReset(idle, form({ email }))).toEqual({
      status: 'sent',
      email,
    });
    expect(payload.forgotPassword).not.toHaveBeenCalled();
    await afterTheAnswer();
    for (const collection of ['users', 'customers'])
      expect(payload.forgotPassword).toHaveBeenCalledWith({
        collection,
        data: { email },
      });
  });

  it('answers the same when the letter fails, and logs no address', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    payload.forgotPassword.mockRejectedValue(
      Object.assign(new Error(`Rejected ${email}`), { code: 'EENVELOPE' }),
    );
    expect(await requestReset(idle, form({ email }))).toEqual({
      status: 'sent',
      email,
    });
    await afterTheAnswer();
    expect(log).toHaveBeenCalledWith('Account reset letter:', 'EENVELOPE');
  });
});

describe('resetPassword', () => {
  const token = 'c3'.repeat(20);

  it('changes the password', async () => {
    expect(
      await resetPassword(idle, form({ token, password: 'new password' })),
    ).toEqual({ status: 'changed' });
    expect(payload.resetPassword).toHaveBeenCalledWith({
      collection: 'customers',
      data: { token, password: 'new password' },
      overrideAccess: true,
    });
  });

  it('says a used or old link is no good', async () => {
    payload.resetPassword.mockRejectedValue(
      Object.assign(new Error('Token is either invalid or has expired.'), {
        status: 403,
      }),
    );
    expect(
      await resetPassword(idle, form({ token, password: 'new password' })),
    ).toEqual({ status: 'expired' });
  });
});

describe('waitingToken', () => {
  const token = 'a1'.repeat(20);

  it('gives back a token an account waits for, and only reads', async () => {
    payload.count.mockResolvedValue({ totalDocs: 1 });
    expect(await waitingToken(token)).toBe(token);
    expect(payload.verifyEmail).not.toHaveBeenCalled();
    expect(payload.update).not.toHaveBeenCalled();
  });

  it('says no to a used token and asks nothing for a forged one', async () => {
    payload.count.mockResolvedValue({ totalDocs: 0 });
    expect(await waitingToken(token)).toBeNull();
    payload.count.mockClear();
    expect(await waitingToken("' or 1=1")).toBeNull();
    expect(payload.count).not.toHaveBeenCalled();
  });
});

describe('signOut', () => {
  it('ends the session through Payload', async () => {
    await signOut();
    expect(logout).toHaveBeenCalledOnce();
  });
});

describe('updateProfile', () => {
  const profile = { firstName: 'Ольга', lastName: 'Нова', phone: '0671234567' };

  it('changes only the signed-in shopper, and only their name and phone', async () => {
    payload.auth.mockResolvedValue({ user: shopper });
    expect(
      await updateProfile(
        idle,
        form({
          ...profile,
          email: 'other@example.com',
          id: '9',
          role: 'owner',
        }),
      ),
    ).toEqual({ status: 'saved' });
    // Named columns in one statement: the whole row would write back what it read earlier.
    expect(payload.db.updateOne).toHaveBeenCalledWith({
      collection: 'customers',
      data: {
        firstName: 'Ольга',
        lastName: 'Нова',
        phone: '+380671234567',
        updatedAt: expect.any(String),
      },
      options: { atomic: true },
      where: { id: { equals: 5 } },
    });
    expect(payload.update).not.toHaveBeenCalled();
  });

  it.each([
    ['nobody', null],
    ['staff', { id: 5, collection: 'users', role: 'owner' }],
  ])('changes nothing for %s', async (_, user) => {
    payload.auth.mockResolvedValue({ user });
    expect(await updateProfile(idle, form(profile))).toEqual({
      status: 'failed',
    });
    expect(payload.db.updateOne).not.toHaveBeenCalled();
  });
});

describe('myOrders', () => {
  it("asks with the shopper's own access, so the manager's note stays out", async () => {
    payload.find.mockResolvedValue({ docs: [{ id: 1 }] });
    expect(await myOrders(shopper as never)).toEqual([{ id: 1 }]);
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'orders',
        user: shopper,
        overrideAccess: false,
        limit: CUSTOMER_ORDERS,
        where: { customer: { equals: 5 } },
      }),
    );
  });
});

describe('the letters', () => {
  const token = 'a1'.repeat(20);

  it('lead to the store in the language of registration', () => {
    expect(verifyLetter(token, 'uk').html).toContain(
      `/account/verify?token=${token}`,
    );
    expect(verifyLetter(token, 'uk').subject).toContain('Підтвердьте');
    expect(verifyLetter(token, 'en').html).toContain(
      `/en/account/verify?token=${token}`,
    );
    expect(verifyLetter(token, 'en').subject).toContain('Confirm');
    expect(resetLetter(token, 'en').html).toContain(
      `/en/account/reset?token=${token}`,
    );
    expect(resetLetter(token, 'uk').subject).toContain('пароль');
  });

  it('fall back to Ukrainian', () => {
    expect(verifyLetter(token, null).subject).toContain('Підтвердьте');
  });

  it('lead staff to the admin', () => {
    expect(staffResetLetter(token).html).toContain(`/admin/reset/${token}`);
  });

  it('are what Payload sends for both collections, far apart', () => {
    const { auth } = Customers;
    const args = { token, user: { locale: 'en' }, req: {} } as never;
    if (typeof auth !== 'object') throw new Error('customers have auth');
    expect(
      typeof auth.verify === 'object' && auth.verify.generateEmailHTML?.(args),
    ).toBe(verifyLetter(token, 'en').html);
    expect(auth.forgotPassword?.generateEmailHTML?.(args)).toBe(
      resetLetter(token, 'en').html,
    );
    expect(auth.forgotPassword?.minRequestInterval).toBe(LETTER_INTERVAL);
    const staff = Users.auth;
    if (typeof staff !== 'object') throw new Error('users have auth');
    expect(staff.forgotPassword?.generateEmailHTML?.(args)).toBe(
      staffResetLetter(token).html,
    );
    expect(staff.forgotPassword?.minRequestInterval).toBe(LETTER_INTERVAL);
  });
});

describe('the mail adapter', () => {
  it('without the variables sends nothing and logs nothing', async () => {
    const log = vi.spyOn(console, 'log');
    const adapter = await emailAdapter({} as never);
    const logger = { info: vi.fn() };
    const { name, sendEmail } = adapter({ payload: { logger } } as never);
    expect(name).toBe('none');
    await sendEmail({ to: email, subject: 'x' });
    expect(logger.info).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('with the variables is SMTP, TLS from the start on port 465', async () => {
    const adapter = await emailAdapter({
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_PORT: 465,
      SMTP_USER: 'store@gmail.com',
      SMTP_PASSWORD: 'app-password',
      SMTP_FROM: 'store@gmail.com',
    } as never);
    const { name, defaultFromAddress } = adapter({ payload: {} } as never);
    expect(name).toBe('nodemailer');
    expect(defaultFromAddress).toBe('store@gmail.com');
  });

  it('gives a server that stops answering seconds, not minutes', async () => {
    await emailAdapter({
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_PORT: 465,
      SMTP_FROM: 'store@gmail.com',
    } as never);
    expect(
      vi.mocked(nodemailerAdapter).mock.lastCall?.[0]?.transportOptions,
    ).toMatchObject({
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
    });
  });
});
