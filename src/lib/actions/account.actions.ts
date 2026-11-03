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

import { currentCustomer, sessionUser } from '@/lib/actions/customer.actions';
import { LETTER_INTERVAL } from '@/lib/constants';
import { verifyLetter } from '@/lib/email';
import { verifyTurnstile } from '@/lib/turnstile';
import {
  emailRequest,
  parseAccountForm,
  passwordReset,
  phoneSignInRequest,
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

// A number is one account's, and only a confirmed one keeps it from anyone: nobody proves a number,
// so an account nobody confirmed must not hold it against its real holder. It goes on without the
// number. One statement, as that account may be confirming right now; one whose token the owner took
// away counts as confirmed, as for its email (`register`). Answers null when the number is somebody's,
// or else how to give it back if the write it was for does not happen: never in a transaction with
// that write, which would hold this row through Payload's reads (RULES.md). Giving back fails harmlessly
// when someone has the number by then.
const claimPhone = async (payload: Payload, phone: string, mine?: number) => {
  const holder = await payload.db.findOne<Customer>({
    collection: 'customers',
    where: { phone: { equals: phone } },
  });
  if (!holder || holder.id === mine) return async () => {};
  const released = await payload.db.updateOne({
    collection: 'customers',
    data: { phone: null, updatedAt: new Date().toISOString() },
    options: { atomic: true },
    where: {
      and: [
        { id: { equals: holder.id } },
        { _verified: { equals: false } },
        { _verificationToken: { exists: true } },
      ],
    },
  });
  if (!released) return null;
  return async () => {
    await payload.db
      .updateOne({
        collection: 'customers',
        data: { phone, updatedAt: new Date().toISOString() },
        options: { atomic: true },
        where: {
          and: [{ id: { equals: holder.id } }, { phone: { exists: false } }],
        },
      })
      .catch(() => null);
  };
};

// Someone got the number between `claimPhone` and the write: Payload's answer to a whole row, the
// database's to an atomic write.
const numberTaken = (error: unknown) => {
  const { cause, data } = error as {
    cause?: { constraint?: string };
    data?: { errors?: { path?: string }[] };
  };
  return (
    cause?.constraint === 'customers_phone_idx' ||
    Boolean(data?.errors?.some(({ path }) => path === 'phone'))
  );
};

const phoneTaken = () => refused({ phone: ['phoneTaken'] });

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
// `verify` stay, as only the mailbox has the token. A number is a shopper's, and leads to their email:
// staff's row is never asked, or typing a shopper's number would count wrong passwords against an
// address they share. An unknown number answers as a wrong password does. Numbers can be walked, one
// password across all of them, and the lock is per account, so a number passes Turnstile first; an
// email does not, as `/api/customers/login` takes one without it (adr-20261103-phone-sign-in).
export async function signIn(
  _: AccountState,
  form: FormData,
): Promise<AccountState> {
  const parsed = form.has('phone')
    ? parseAccountForm(phoneSignInRequest, form)
    : parseAccountForm(signInRequest, form);
  if (!parsed.data) return refused(parsed.errors);
  const { data } = parsed;
  const { token: letter, password } = data;
  const byPhone = 'phone' in data;
  if (byPhone && !(await verifyTurnstile(data['cf-turnstile-response'])))
    return { status: 'failed' };
  let answer: AccountState = { status: 'wrong' };
  try {
    const payload = await getPayload({ config });
    const email = byPhone
      ? (
          await payload.db.findOne<Customer>({
            collection: 'customers',
            where: { phone: { equals: data.phone } },
          })
        )?.email
      : data.email;
    if (!email) return answer;
    const credentials = { email, password };
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
    for (const slug of byPhone
      ? (['customers'] as const)
      : (['users', 'customers'] as const)) {
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
  let giveBack: (() => Promise<void>) | null = null;
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
    // Before the number moves: nobody can confirm a row whose token the owner took away, so it is
    // somebody's.
    if (found && (found._verified || !found._verificationToken))
      return refused({ email: ['taken'] });
    giveBack = await claimPhone(payload, account.phone, found?.id);
    if (!giveBack) return phoneTaken();
    if (found) {
      const req = await createLocalReq({}, payload);
      await initTransaction(req);
      try {
        // Holds the row until the commit, so a confirmation waits and then sees the new hash. An
        // account confirmed or unticked by now is not written.
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
        if (!held) {
          await giveBack();
          return refused({ email: ['taken'] });
        }
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
    await giveBack?.();
    if (numberTaken(error)) return phoneTaken();
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

// A shopper changes their own data only here: the collection's `update` is the owner's. A new number
// passes Turnstile first, as at sign-in: one session could otherwise walk numbers here, learning who
// holds them and taking them from accounts nobody confirmed (adr-20261103-phone-sign-in).
export async function updateProfile(
  _: AccountState,
  form: FormData,
): Promise<AccountState> {
  const parsed = parseAccountForm(profileUpdate, form);
  if (!parsed.data) return refused(parsed.errors);
  const { token, ...profile } = parsed.data;
  let giveBack: (() => Promise<void>) | null = null;
  try {
    const customer = await currentCustomer();
    if (!customer) return { status: 'failed' };
    const payload = await getPayload({ config });
    const { phone } = profile;
    if (phone && phone !== customer.phone) {
      if (!(await verifyTurnstile(token))) return { status: 'failed' };
      giveBack = await claimPhone(payload, phone, customer.id);
      if (!giveBack) return phoneTaken();
    }
    // These columns only: `payload.update` writes the whole row it read, over what changed meanwhile.
    const saved = await payload.db.updateOne({
      collection: 'customers',
      data: { ...profile, updatedAt: new Date().toISOString() },
      options: { atomic: true },
      where: { id: { equals: customer.id } },
    });
    if (saved) return { status: 'saved' };
    // The owner deleted this shopper meanwhile.
    await giveBack?.();
    return { status: 'failed' };
  } catch (error) {
    await giveBack?.();
    if (numberTaken(error)) return phoneTaken();
    return failed('profile', error);
  }
}

// The header asks on a click, never on a page, so its pages stay cached (`AccountLink`).
export async function isSignedIn() {
  return Boolean(await sessionUser());
}
