'use server';

import config from '@payload-config';
import { logout } from '@payloadcms/next/auth';
import { cookies } from 'next/headers';
import { after } from 'next/server';
import {
  AuthenticationError,
  commitTransaction,
  createLocalReq,
  getPayload,
  initTransaction,
  killTransaction,
  LockedAuth,
  loginOperation,
  type Payload,
  UnverifiedEmail,
} from 'payload';
import { generatePayloadCookie } from 'payload/shared';

import { currentCustomer } from '@/lib/actions/customer.actions';
import { LETTER_INTERVAL } from '@/lib/constants';
import { verifyLetter } from '@/lib/email';
import { verifyTurnstile } from '@/lib/turnstile';
import {
  emailRequest,
  parseAccountForm,
  passwordReset,
  profileUpdate,
  registerRequest,
  signInRequest,
} from '@/lib/validators';
import type { AccountState } from '@/types';
import type { Customer } from '@/payload-types';

// Only what went wrong: a failed query carries its params, the database's detail the failing row,
// and a mail server's refusal the address. A mail error's code says as much without them.
const failed = (action: string, error: unknown): AccountState => {
  const { code, message, cause } = error as {
    code?: unknown;
    message?: string;
    cause?: { message?: string };
  };
  console.error(
    `Account ${action}:`,
    code ?? cause?.message ?? message?.split('\n')[0],
  );
  return { status: 'failed' };
};

const refused = (errors: object): AccountState => ({
  status: 'invalid',
  errors,
});

// The letter of an account that is not confirmed yet, one per LETTER_INTERVAL: a mailbox is not to be
// flooded, and Gmail's daily limit is every shopper's. The last letter's link stays good, so the
// answer is the same. One statement books the interval, as Payload's `forgotPassword` does, so
// requests at once send one letter. An account with no token (the owner unticked `_verified`) has
// no link to send.
const sendVerification = async (payload: Payload, customer: Customer) => {
  if (!customer._verificationToken) return;
  const now = new Date();
  const booked = now.toISOString();
  const since = new Date(now.getTime() - LETTER_INTERVAL).toISOString();
  const free = await payload.db.updateOne({
    collection: 'customers',
    data: { verificationSentAt: booked },
    options: { atomic: true },
    where: {
      and: [
        { id: { equals: customer.id } },
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
    },
  });
  if (!free) return;
  try {
    await payload.sendEmail({
      to: customer.email,
      ...verifyLetter(String(customer._verificationToken), customer.locale),
    });
  } catch (error) {
    // The next try may go.
    await payload.db.updateOne({
      collection: 'customers',
      data: { verificationSentAt: customer.verificationSentAt ?? null },
      options: { atomic: true },
      where: {
        and: [
          { id: { equals: customer.id } },
          { verificationSentAt: { equals: booked } },
        ],
      },
    });
    throw error;
  }
};

// A letter's link and this account's password: only whoever has both opens the account. One
// statement, as a second registration may be replacing the password right now: `hash` must still be
// what was read before the password was checked, or nothing is confirmed.
const confirm = async (
  payload: Payload,
  { id, hash, _verificationToken }: Customer,
) =>
  Boolean(
    await payload.db.updateOne({
      collection: 'customers',
      data: {
        _verified: true,
        _verificationToken: null,
        updatedAt: new Date().toISOString(),
      },
      options: { atomic: true },
      where: {
        and: [
          { id: { equals: id } },
          { hash: { equals: hash } },
          { _verificationToken: { equals: _verificationToken } },
        ],
      },
    }),
  );

// One form for everyone: staff first, so an email and a password that match both collections sign
// in as staff (adr-20261103-customer-accounts). `loginOperation`, not `payload.login`, which takes
// the token away for `removeTokenFromResponses`; and the cookie written here, as Payload's own
// `login` helper counts its term in milliseconds. With a letter's token, the right password confirms
// the email: the store's only way to confirm one (`/account/verify`). Payload's REST and GraphQL
// `verify` stay, as only the mailbox has the token.
export async function signIn(
  _: AccountState,
  form: FormData,
): Promise<AccountState> {
  const parsed = parseAccountForm(signInRequest, form);
  if (!parsed.data) return refused(parsed.errors);
  const { token: letter, ...credentials } = parsed.data;
  let answer: AccountState = { status: 'wrong' };
  try {
    const payload = await getPayload({ config });
    // Before the password is checked, so `confirm` can tell if it was replaced since. The token has
    // to be this account's, not just anyone's who is waiting.
    const waiting = letter
      ? await payload.db.findOne<Customer>({
          collection: 'customers',
          where: {
            and: [
              { email: { equals: credentials.email } },
              { _verificationToken: { equals: letter } },
            ],
          },
        })
      : null;
    const signInTo = async (slug: 'users' | 'customers') => {
      const collection = payload.collections[slug];
      const { token } = await loginOperation({
        collection,
        data: credentials,
        overrideAccess: true,
        req: await createLocalReq({}, payload),
      });
      const cookie = generatePayloadCookie({
        collectionAuthConfig: collection.config.auth,
        cookiePrefix: payload.config.cookiePrefix,
        returnCookieAsObject: true,
        token: String(token),
      });
      (await cookies()).set({
        ...cookie,
        value: String(token),
        expires: new Date(String(cookie.expires)),
        sameSite: 'lax',
      });
    };
    for (const slug of ['users', 'customers'] as const) {
      try {
        await signInTo(slug);
        return { status: slug === 'users' ? 'staff' : 'customer' };
      } catch (error) {
        // The right password of an account not confirmed says more than a locked twin.
        if (error instanceof UnverifiedEmail) {
          if (waiting && (await confirm(payload, waiting))) {
            await signInTo('customers');
            return { status: 'customer' };
          }
          answer = { status: 'unverified', email: credentials.email };
        } else if (error instanceof LockedAuth) {
          if (answer.status === 'wrong') answer = { status: 'locked' };
        } else if (!(error instanceof AuthenticationError)) throw error;
      }
    }
    return answer;
  } catch (error) {
    return failed('sign-in', error);
  }
}

// An account is created only here (the collection's `create` is closed to everyone): the form's
// fields, then Turnstile, then the record, whose creation sends the letter and is undone if it
// fails. An email nobody confirmed belongs to nobody yet: registering it again replaces the password,
// and the letter goes to the address, never to whoever typed it. So whoever registered someone
// else's address never gets a confirmed account: the link needs the password, and they have no link.
export async function register(
  _: AccountState,
  form: FormData,
): Promise<AccountState> {
  const parsed = parseAccountForm(registerRequest, form);
  if (!parsed.data) return refused(parsed.errors);
  const { token, ...account } = parsed.data;
  if (!(await verifyTurnstile(token))) return { status: 'failed' };
  try {
    const payload = await getPayload({ config });
    const {
      docs: [found],
    } = await payload.find({
      collection: 'customers',
      where: { email: { equals: account.email } },
      limit: 1,
      depth: 0,
      showHiddenFields: true,
    });
    if (found?._verified) return refused({ email: ['taken'] });
    if (found) {
      const req = await createLocalReq({}, payload);
      await initTransaction(req);
      try {
        // Holds the row until the commit, so a confirmation waits and then sees the new hash. An
        // account confirmed by now is not written, nor one whose token the owner took away by unticking
        // `_verified`: nobody can confirm that one, and it is somebody's.
        const held = await payload.db.updateOne({
          collection: 'customers',
          data: { updatedAt: new Date().toISOString() },
          options: { atomic: true },
          req,
          where: {
            and: [
              { id: { equals: found.id } },
              { _verified: { equals: false } },
              { _verificationToken: { exists: true } },
            ],
          },
        });
        if (held)
          await payload.update({
            collection: 'customers',
            id: found.id,
            data: account,
            req,
          });
        await commitTransaction(req);
        if (!held) return refused({ email: ['taken'] });
      } catch (error) {
        await killTransaction(req);
        throw error;
      }
      await sendVerification(payload, { ...found, locale: account.locale });
    } else {
      await payload.create({ collection: 'customers', data: account });
    }
    return { status: 'sent', email: account.email };
  } catch (error) {
    return failed('registration', error);
  }
}

// The same answer whether there is such an account or not.
export async function resendVerification(
  _: AccountState,
  form: FormData,
): Promise<AccountState> {
  const parsed = parseAccountForm(emailRequest, form);
  if (!parsed.data) return refused(parsed.errors);
  const { token, email } = parsed.data;
  if (!(await verifyTurnstile(token))) return { status: 'failed' };
  try {
    const payload = await getPayload({ config });
    const {
      docs: [found],
    } = await payload.find({
      collection: 'customers',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      showHiddenFields: true,
    });
    if (found && !found._verified) await sendVerification(payload, found);
    return { status: 'sent', email };
  } catch (error) {
    return failed('verification letter', error);
  }
}

// Payload's forgot-password holds a pool client and asks for another: one at a time, however many ask,
// leaves the rest of the pool to the store.
let resetLetters: Promise<unknown> = Promise.resolve();

// One form for everyone, so both collections are asked. Sent after the answer: it is the same
// whether there is such an account or not, however long the letter takes and even if it fails.
export async function requestReset(
  _: AccountState,
  form: FormData,
): Promise<AccountState> {
  const parsed = parseAccountForm(emailRequest, form);
  if (!parsed.data) return refused(parsed.errors);
  const { token, email } = parsed.data;
  if (!(await verifyTurnstile(token))) return { status: 'failed' };
  const send = async () => {
    try {
      const payload = await getPayload({ config });
      await payload.forgotPassword({ collection: 'users', data: { email } });
      await payload.forgotPassword({
        collection: 'customers',
        data: { email },
      });
    } catch (error) {
      failed('reset letter', error);
    }
  };
  after(() => (resetLetters = resetLetters.then(send)));
  return { status: 'sent', email };
}

// Only a shopper's: staff's letter leads to the admin's own page.
export async function resetPassword(
  _: AccountState,
  form: FormData,
): Promise<AccountState> {
  const parsed = parseAccountForm(passwordReset, form);
  if (!parsed.data) return refused(parsed.errors);
  try {
    const payload = await getPayload({ config });
    await payload.resetPassword({
      collection: 'customers',
      data: parsed.data,
      overrideAccess: true,
    });
    return { status: 'changed' };
  } catch (error) {
    if ((error as { status?: number }).status === 403)
      return { status: 'expired' };
    return failed('password reset', error);
  }
}

// Ends the session on the server too, and takes the cookie away.
export async function signOut() {
  await logout({ config });
}

// A shopper changes their own data only here: the collection's `update` is the owner's.
export async function updateProfile(
  _: AccountState,
  form: FormData,
): Promise<AccountState> {
  const parsed = parseAccountForm(profileUpdate, form);
  if (!parsed.data) return refused(parsed.errors);
  try {
    const customer = await currentCustomer();
    if (!customer) return { status: 'failed' };
    const payload = await getPayload({ config });
    // These columns only: `payload.update` writes the whole row it read, over what changed meanwhile.
    await payload.db.updateOne({
      collection: 'customers',
      data: { ...parsed.data, updatedAt: new Date().toISOString() },
      options: { atomic: true },
      where: { id: { equals: customer.id } },
    });
    return { status: 'saved' };
  } catch (error) {
    return failed('profile', error);
  }
}
