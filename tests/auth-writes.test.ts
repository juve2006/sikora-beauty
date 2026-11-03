import { AuthenticationError, Forbidden } from 'payload';
import { describe, expect, it, vi } from 'vitest';

import { keepPasswordChanges, markAccessWrites } from '@/lib/auth-writes';

const req = { t: (key: string) => key };
const sessions = [{ id: 's1' }];

// The adapter as Payload would get it: `updateOne` is the wrapped one, `original` what it calls.
const wrapped = (held: unknown, stored: object[] = sessions) => {
  const original = vi.fn(async (update: { options?: object }) =>
    update.options ? held : { id: 5 },
  );
  const adapter = {
    updateOne: original,
    findOne: vi.fn(async () => ({ sessions: stored })),
    beginTransaction: vi.fn(async () => 7),
    commitTransaction: vi.fn(async () => {}),
    rollbackTransaction: vi.fn(async () => {}),
  };
  keepPasswordChanges({ init: () => adapter } as never).init({} as never);
  return {
    adapter: adapter as typeof adapter & {
      updateOne: (update: object) => unknown;
    },
    original,
  };
};
const sessionWrite = {
  id: 5,
  collection: 'customers',
  data: {
    id: 5,
    email: 'olena@example.com',
    hash: 'read-earlier',
    salt: 'read-earlier',
    firstName: 'Олена',
    sessions,
    updatedAt: null,
  },
  req,
  returning: false,
};

describe('keepPasswordChanges', () => {
  it('holds the row if its hash is what was read, then writes the sessions only', async () => {
    const { adapter, original } = wrapped({ id: 5 });
    await adapter.updateOne(sessionWrite);
    expect(original).toHaveBeenCalledTimes(2);
    expect(original).toHaveBeenNthCalledWith(1, {
      collection: 'customers',
      data: { hash: 'read-earlier' },
      options: { atomic: true },
      req,
      where: {
        and: [{ id: { equals: 5 } }, { hash: { equals: 'read-earlier' } }],
      },
    });
    expect(original).toHaveBeenNthCalledWith(2, {
      ...sessionWrite,
      data: { sessions, updatedAt: null },
    });
  });

  it('refuses the session of a password changed since it was read', async () => {
    const { adapter, original } = wrapped(null);
    await expect(adapter.updateOne(sessionWrite)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    expect(original).toHaveBeenCalledOnce();
  });

  it('brings back no session closed since it was read', async () => {
    const { adapter, original } = wrapped({ id: 5 }, [{ id: 's2' }]);
    await adapter.updateOne({
      ...sessionWrite,
      data: {
        ...sessionWrite.data,
        sessions: [{ id: 's1' }, { id: 's2' }],
      },
    });
    expect(original.mock.lastCall?.[0]).toMatchObject({
      data: { sessions: [{ id: 's2' }] },
    });
  });

  const opened = { id: 's2', expiresAt: '2999-01-01T00:00:00Z' };
  const expired = { id: 's3', expiresAt: '2000-01-01T00:00:00Z' };

  it('adds a sign-in to what is stored by now, not to what it read', async () => {
    const { adapter, original } = wrapped({ id: 5 }, [opened, expired]);
    await adapter.updateOne({
      ...sessionWrite,
      data: {
        ...sessionWrite.data,
        sessions: [{ id: 's1' }, { id: 'new' }],
      },
      req: { ...req, context: { sessionWrite: 'adds' } },
    });
    expect(original.mock.lastCall?.[0]).toMatchObject({
      data: { sessions: [opened, { id: 'new' }] },
    });
  });

  it('refreshes its own session and keeps one opened since it read', async () => {
    const own = { id: 's1', expiresAt: '2999-01-01T00:00:00Z' };
    const { adapter, original } = wrapped({ id: 5 }, [
      { ...own, expiresAt: '2998-01-01T00:00:00Z' },
      opened,
      expired,
    ]);
    await adapter.updateOne({
      ...sessionWrite,
      data: { ...sessionWrite.data, sessions: [own] },
      req: { ...req, context: { sessionWrite: 'refreshes' } },
    });
    expect(original.mock.lastCall?.[0]).toMatchObject({
      data: { sessions: [own, opened] },
    });
  });

  it('refreshes no session closed since it read', async () => {
    const { adapter, original } = wrapped({ id: 5 }, [opened]);
    await adapter.updateOne({
      ...sessionWrite,
      data: { ...sessionWrite.data, sessions: [{ id: 's1' }] },
      req: { ...req, context: { sessionWrite: 'refreshes' } },
    });
    expect(original.mock.lastCall?.[0]).toMatchObject({
      data: { sessions: [opened] },
    });
  });

  it('adds nothing when a failed sign-in takes its session back', async () => {
    const { adapter, original } = wrapped({ id: 5 }, [
      { id: 's1' },
      { id: 'new' },
    ]);
    await adapter.updateOne({
      ...sessionWrite,
      req: { ...req, context: { sessionWrite: 'adds' } },
    });
    expect(original.mock.lastCall?.[0]).toMatchObject({
      data: { sessions: [{ id: 's1' }] },
    });
  });

  // Wrong attempts over the limit: the row from before the password check, with no `req`.
  const wrongAttempts = {
    id: 5,
    collection: 'customers',
    data: {
      ...sessionWrite.data,
      lockUntil: null,
      updatedAt: '2026-11-03T00:00:00Z',
    },
    returning: false,
  };

  it('gives a write of wrong attempts a transaction of its own', async () => {
    const { adapter, original } = wrapped({ id: 5 });
    await adapter.updateOne(wrongAttempts);
    expect(original).toHaveBeenCalledTimes(2);
    expect(original.mock.calls[0][0]).toMatchObject({
      req: { transactionID: 7 },
      where: {
        and: [{ id: { equals: 5 } }, { hash: { equals: 'read-earlier' } }],
      },
    });
    expect(original).toHaveBeenNthCalledWith(2, {
      ...wrongAttempts,
      data: { sessions, updatedAt: '2026-11-03T00:00:00Z' },
      req: { transactionID: 7 },
    });
    expect(adapter.commitTransaction).toHaveBeenCalledWith(7);
    expect(adapter.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('refuses a write of wrong attempts over a changed password', async () => {
    const { adapter, original } = wrapped(null);
    await expect(adapter.updateOne(wrongAttempts)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    expect(original).toHaveBeenCalledOnce();
    expect(adapter.rollbackTransaction).toHaveBeenCalledWith(7);
    expect(adapter.commitTransaction).not.toHaveBeenCalled();
  });

  // What `payload.update` and `verifyEmail` write: all of the row they read.
  const wholeRow = (context: object) => ({
    id: 5,
    collection: 'customers',
    data: {
      firstName: 'Олена',
      hash: 'read-earlier',
      salt: 'read-earlier',
      sessions,
      loginAttempts: 0,
      lockUntil: null,
      resetPasswordToken: 'read-earlier',
      resetPasswordExpiration: '2026-11-03T00:00:00Z',
      updatedAt: '2026-11-03T00:00:00Z',
    },
    req: { context },
  });

  it('writes nothing of who may get in from a row read earlier', async () => {
    const { adapter, original } = wrapped({ id: 5 });
    await adapter.updateOne(wholeRow({}));
    expect(original).toHaveBeenCalledExactlyOnceWith({
      ...wholeRow({}),
      data: { firstName: 'Олена', updatedAt: '2026-11-03T00:00:00Z' },
    });
  });

  it('lets a letter write the reset token and nothing else of it', async () => {
    const { adapter, original } = wrapped({ id: 5 });
    const update = wholeRow({ writesAccess: 'resetToken' });
    await adapter.updateOne(update);
    expect(original).toHaveBeenCalledExactlyOnceWith({
      ...update,
      data: {
        firstName: 'Олена',
        resetPasswordToken: 'read-earlier',
        resetPasswordExpiration: '2026-11-03T00:00:00Z',
        updatedAt: '2026-11-03T00:00:00Z',
      },
    });
  });

  describe('a new password by `update`', () => {
    const newPassword = (user: object | null) => {
      const update = wholeRow({ writesAccess: 'password' });
      return {
        ...update,
        data: { ...update.data, hash: 'new', salt: 'new' },
        req: { ...update.req, t: req.t, user },
      };
    };
    const me = { collection: 'customers', id: 5, _sid: 's1' };

    it('holds the row, then writes all of it but the counters and the token', async () => {
      const { adapter, original } = wrapped({ id: 5 });
      const update = newPassword(me);
      await adapter.updateOne(update);
      expect(original).toHaveBeenCalledTimes(2);
      expect(original.mock.calls[0][0]).toMatchObject({
        options: { atomic: true },
        where: { id: { equals: 5 } },
      });
      expect(original).toHaveBeenNthCalledWith(2, {
        ...update,
        data: {
          firstName: 'Олена',
          hash: 'new',
          salt: 'new',
          sessions,
          updatedAt: '2026-11-03T00:00:00Z',
        },
      });
    });

    it('refuses a session closed by then', async () => {
      const { adapter, original } = wrapped({ id: 5 }, [{ id: 's9' }]);
      await expect(adapter.updateOne(newPassword(me))).rejects.toBeInstanceOf(
        Forbidden,
      );
      expect(original).toHaveBeenCalledOnce();
    });

    it.each([
      ['the owner, on someone else', { collection: 'users', id: 5, _sid: 'x' }],
      ['the server itself', null],
    ])('asks no session of %s', async (_, user) => {
      const { adapter, original } = wrapped({ id: 5 }, []);
      await adapter.updateOne(newPassword(user));
      expect(original).toHaveBeenCalledTimes(2);
    });
  });

  it.each([
    ['a reset', wholeRow({ writesAccess: 'reset' })],
    [
      'a row with no password',
      { id: 5, collection: 'products', data: { updatedAt: null } },
    ],
    [
      'an atomic write',
      {
        collection: 'customers',
        data: { hash: 'new', updatedAt: null },
        options: { atomic: true },
        where: { id: { equals: 5 } },
      },
    ],
  ])('leaves %s alone', async (_, update) => {
    const { adapter, original } = wrapped({ id: 5 });
    await adapter.updateOne(update);
    expect(original).toHaveBeenCalledOnce();
    expect(original).toHaveBeenCalledWith(update);
  });
});

describe('markAccessWrites', () => {
  const contextOf = (operation: string, data: object = {}) => {
    const req = { context: {} as Record<string, unknown> };
    const args = { data };
    expect(markAccessWrites({ args, operation, req } as never)).toBe(args);
    return req.context;
  };

  it.each([
    ['resetPassword', {}, { writesAccess: 'reset', sessionWrite: 'adds' }],
    ['forgotPassword', {}, { writesAccess: 'resetToken' }],
    ['login', {}, { sessionWrite: 'adds' }],
    ['refresh', {}, { sessionWrite: 'refreshes' }],
    ['update', { password: 'a-new-password' }, { writesAccess: 'password' }],
  ])('marks %s', (operation, data, context) => {
    expect(contextOf(operation, data)).toEqual(context);
  });

  it.each([
    ['a save', 'update', { firstName: 'Олена' }],
    ['an empty password', 'update', { password: '' }],
    // Payload saves no password that is not a string, and would write the row it read.
    ['a password that is not text', 'update', { password: { a: 1 } }],
    ['a sign-out', 'logout', {}],
  ])('marks nothing for %s', (_, operation, data) => {
    expect(contextOf(operation, data)).toEqual({});
  });
});
