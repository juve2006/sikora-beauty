'use client';

import { useTranslations } from 'next-intl';
import AccountField from './account-field';
import ResendForm from './resend-form';
import { useAccountForm } from './use-account-form';
import { signIn } from '@/lib/actions/account.actions';
import { signInRequest } from '@/lib/validators';
import { Link, useRouter } from '@/i18n/navigation';
import type { AccountState } from '@/types';
import { Button } from '@/components/ui/button';

// One form for everyone, wherever it is. A shopper goes to the home page, staff to `/account`, which
// sends the owner and the cosmetologist on to the admin.
const SignInForm = ({
  token,
  initialState,
  sending = false,
}: {
  // A letter's token: the right password then confirms the email too.
  token?: string;
  // /canvas only: a state to start from, and the form while it sends.
  initialState?: AccountState;
  sending?: boolean;
}) => {
  const t = useTranslations('Account');
  const router = useRouter();
  const { state, pending, form, errors, onSubmit } = useAccountForm({
    action: signIn,
    schema: signInRequest,
    initialState,
    onAnswer: ({ status }) => {
      if (status === 'customer') router.replace('/');
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
        <AccountField
          label={t('email')}
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          errors={errors.email}
        />
        <AccountField
          label={t('password')}
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={200}
          required
          errors={errors.password}
        />
        {(state.status === 'wrong' ||
          state.status === 'locked' ||
          state.status === 'failed') && (
          <p role="alert" className="text-sm text-destructive">
            {t(state.status)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button type="submit" disabled={busy}>
            {busy ? t('signingIn') : t('signIn')}
          </Button>
          <Button asChild variant="link" className="px-0">
            <Link href="/account/reset">{t('forgot')}</Link>
          </Button>
        </div>
      </form>
      {state.status === 'unverified' && (
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-sm text-destructive">
            {t('unverified')}
          </p>
          <ResendForm email={state.email} />
        </div>
      )}
    </div>
  );
};

export default SignInForm;
