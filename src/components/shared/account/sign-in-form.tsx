'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import AccountField from './account-field';
import OtherWays from './other-ways';
import PhoneField from './phone-field';
import ResendForm from './resend-form';
import { useAccountForm } from './use-account-form';
import Turnstile from '@/components/shared/consultation/turnstile';
import { signIn } from '@/lib/actions/account.actions';
import { phoneSignInRequest, signInRequest } from '@/lib/validators';
import { Link, useRouter } from '@/i18n/navigation';
import type { AccountState } from '@/types';
import { Button } from '@/components/ui/button';

type Props = {
  // A letter's token and the address it went to: the right password then confirms the email too.
  token?: string;
  email?: string;
  // In the dialog: a shopper stays where they are, and a link out closes it.
  onSignedIn?: () => void;
  onLeave?: () => void;
  // A letter's page: a shopper goes on to their account. Not read off the token, which the page
  // re-rendered for the new session no longer has.
  toAccount?: boolean;
  // /canvas only: a state to start from and the form while it sends.
  initialState?: AccountState;
  sending?: boolean;
  // By email from the start: /canvas and a letter's page.
  byEmail?: boolean;
};

const Fields = ({
  by,
  onSwitch,
  token,
  email,
  onSignedIn,
  onLeave,
  toAccount = false,
  initialState,
  sending = false,
}: Props & { by: 'phone' | 'email'; onSwitch: () => void }) => {
  const t = useTranslations('Account');
  const router = useRouter();
  const { state, pending, form, errors, onSubmit } = useAccountForm({
    action: signIn,
    schema: by === 'phone' ? phoneSignInRequest : signInRequest,
    turnstile: by === 'phone',
    initialState,
    onAnswer: ({ status }) => {
      if (status === 'customer') {
        if (onSignedIn) onSignedIn();
        else router.replace(toAccount ? '/account' : '/');
      }
      if (status === 'staff') router.replace('/account');
    },
  });
  const busy =
    pending ||
    sending ||
    state.status === 'staff' ||
    state.status === 'customer';
  return (
    <div className="flex flex-col gap-4">
      <form
        ref={form}
        method="post"
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-4"
      >
        {token && <input type="hidden" name="token" value={token} />}
        {by === 'phone' ? (
          <PhoneField errors={errors.phone} />
        ) : (
          <AccountField
            label={t('email')}
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={email}
            maxLength={254}
            required
            errors={errors.email}
          />
        )}
        <div className="flex flex-col gap-1">
          <AccountField
            label={t('password')}
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={200}
            required
            errors={errors.password}
          />
          <Button
            asChild
            variant="link"
            size="sm"
            className="h-auto self-end px-0 py-1 text-xs font-normal text-muted-foreground"
          >
            <Link href="/account/reset" onClick={onLeave}>
              {t('forgot')}
            </Link>
          </Button>
        </div>
        {by === 'phone' && <Turnstile attempt={state} />}
        {(state.status === 'wrong' ||
          state.status === 'locked' ||
          state.status === 'failed') && (
          <p role="alert" className="text-sm text-destructive">
            {t(
              state.status === 'wrong' && by === 'phone'
                ? 'wrongPhone'
                : state.status,
            )}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? t('signingIn') : t('signIn')}
        </Button>
      </form>
      {state.status === 'unverified' && (
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-sm text-destructive">
            {t('unverified')}
          </p>
          <ResendForm email={state.email} />
        </div>
      )}
      <OtherWays label={t('orSignIn')}>
        <Button type="button" variant="outline" onClick={onSwitch}>
          {by === 'phone' ? t('byEmail') : t('byPhone')}
        </Button>
      </OtherWays>
    </div>
  );
};

// One form for everyone, wherever it is, by phone or by email: staff have no number, so they sign in by
// email. A shopper goes to the home page, to their account from a letter, or stays on their page in the
// dialog; staff go to `/account`, which sends the owner and the cosmetologist on to the admin. Switching the way starts the fields
// over: an answer about a number says nothing of an email.
const SignInForm = ({ byEmail = false, ...props }: Props) => {
  const [by, setBy] = useState<'phone' | 'email'>(byEmail ? 'email' : 'phone');
  return (
    <Fields
      key={by}
      {...props}
      by={by}
      onSwitch={() => setBy(by === 'phone' ? 'email' : 'phone')}
    />
  );
};

export default SignInForm;
