import {
  AuthenticationError,
  type CollectionBeforeOperationHook,
  type Config,
  Forbidden,
} from 'payload';

// Who may get in, on a row of `users` or `customers`.
const LOGIN_COUNTERS = ['loginAttempts', 'lockUntil'];
const RESET_TOKEN = ['resetPasswordToken', 'resetPasswordExpiration'];
const ACCESS = ['hash', 'salt', 'sessions', ...LOGIN_COUNTERS];

type Session = { id: string; expiresAt?: Date | string };
type WithSessions = { id: number | string; sessions?: Session[] };

const without = (data: Record<string, unknown>, names: string[]) =>
  Object.fromEntries(
    Object.entries(data).filter(([name]) => !names.includes(name)),
  );

// The operations that come to change who may get in say so, for `keepPasswordChanges`. A mark lasts as
// long as the request: REST runs one operation in it, and GraphQL could run more, so `graphQL` keeps its
// mutations off both collections.
export const markAccessWrites: CollectionBeforeOperationHook = ({
  args,
  operation,
  req,
}) => {
  if (operation === 'login') req.context.sessionWrite = 'adds';
  if (operation === 'refresh') req.context.sessionWrite = 'refreshes';
  if (operation === 'resetPassword') {
    req.context.sessionWrite = 'adds';
    req.context.writesAccess = 'reset';
  }
  if (operation === 'forgotPassword') req.context.writesAccess = 'resetToken';
  if (operation === 'update') {
    const { password } = args.data as { password?: unknown };
    if (password && typeof password === 'string')
      req.context.writesAccess = 'password';
  }
  return args;
};

// What a session write meant, on what is stored by now: the sessions it read may hold one closed since,
// which it would bring back, or miss one opened since. A sign-in adds its own, the last it read; a
// refresh changes its own. The rest only take sessions away.
const sessionsNow = (read: Session[], stored: Session[], kind?: unknown) => {
  const isStored = ({ id }: Session) =>
    stored.some((session) => session.id === id);
  const live = stored.filter(
    ({ expiresAt }) => expiresAt && new Date(expiresAt) > new Date(),
  );
  const added = kind === 'adds' ? read.at(-1) : undefined;
  if (added && !isStored(added)) return [...live, added];
  if (kind === 'refreshes')
    return live.map(
      (session) => read.find(({ id }) => id === session.id) ?? session,
    );
  return read.filter(isStored);
};

// Payload writes a row with all it read earlier: at sign-in from before the password check, after wrong
// attempts over the limit, in `refresh`, `logout`, `verifyEmail` and every `payload.update`. A password
// changed meanwhile would be undone, with the old sessions and the reset token, while the form says it
// was changed. So only an operation marked above writes those columns. A session write holds the row
// first, if its hash is still the one it read, and is refused if not, and it writes the sessions, nothing
// else: the transaction keeps the row until the commit. A new password by `update` holds it too, and a
// session closed by then, by a reset or a sign-out, does not get to choose one. Any other write leaves
// those columns as they are. Holding only here, at the write: earlier the row would stay held through
// Payload's own reads, which ask the pool for another client while whoever waits for the row holds one.
export const keepPasswordChanges = (db: Config['db']): Config['db'] => ({
  ...db,
  init: (args) => {
    const adapter = db.init(args);
    const write = adapter.updateOne.bind(adapter);
    const storedSessions = async ({
      collection,
      id,
      req,
    }: Parameters<typeof write>[0]) => {
      const row = await adapter.findOne<WithSessions>({
        collection,
        req,
        select: { sessions: true },
        where: { id: { equals: id } },
      });
      return row?.sessions ?? [];
    };

    const writeNewPassword: typeof write = async (update) => {
      const { collection, data, id, req } = update;
      await write({
        collection,
        data: { updatedAt: data.updatedAt },
        options: { atomic: true },
        req,
        where: { id: { equals: id } },
      });
      const stored = await storedSessions(update);
      const user = req?.user as {
        collection?: string;
        id?: unknown;
        _sid?: string;
      };
      if (
        user?.collection === collection &&
        String(user.id) === String(id) &&
        !stored.some((session) => session.id === user._sid)
      )
        throw new Forbidden(req?.t);
      return write({
        ...update,
        data: {
          ...without(data, [...LOGIN_COUNTERS, ...RESET_TOKEN]),
          sessions: sessionsNow(data.sessions as Session[], stored),
        },
      });
    };

    const writeSessions: typeof write = async (update) => {
      const { collection, data, id, req } = update;
      // Only wrong attempts over the limit come without a `req`, and a transaction of their own.
      const own = req ? undefined : await adapter.beginTransaction();
      const inside = req ?? { transactionID: own ?? undefined };
      try {
        const held = await write({
          collection,
          data: { hash: data.hash },
          options: { atomic: true },
          req: inside,
          where: {
            and: [{ id: { equals: id } }, { hash: { equals: data.hash } }],
          },
        });
        if (!held) throw new AuthenticationError(req?.t);
        const written = await write({
          ...update,
          data: {
            sessions: sessionsNow(
              data.sessions as Session[],
              await storedSessions({ ...update, req: inside }),
              req?.context?.sessionWrite,
            ),
            updatedAt: data.updatedAt,
          },
          req: inside,
        });
        if (own) await adapter.commitTransaction(own);
        return written;
      } catch (error) {
        if (own) await adapter.rollbackTransaction(own);
        throw error;
      }
    };

    adapter.updateOne = (async (update) => {
      const { data, id, req } = update;
      if (!id || !data.hash) return write(update);
      // `updatedAt: null` is how Payload marks a write of sessions only.
      if (data.updatedAt === null || !req) return writeSessions(update);
      const marked = req.context?.writesAccess;
      if (marked === 'reset') return write(update);
      if (marked === 'password') return writeNewPassword(update);
      return write({
        ...update,
        data: without(
          data,
          marked === 'resetToken' ? ACCESS : [...ACCESS, ...RESET_TOKEN],
        ),
      });
    }) as typeof adapter.updateOne;
    return adapter;
  },
});
