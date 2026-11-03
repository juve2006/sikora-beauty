'use client';

import { useTranslations } from 'next-intl';
import AccountField from './account-field';
import SignInForm from './sign-in-form';
import { useAccountForm } from './use-account-form';
import { resetPassword } from '@/lib/actions/account.actions';
import { passwordReset } from '@/lib/validators';
import { Link } from '@/i18n/navigation';
import type { AccountState } from '@/types';
import { Button } from '@/components/ui/button';

// A reset letter's link: the new password, then the way in. The token is the check, so no Turnstile.
const NewPasswordForm = ({
  token,
  initialState,
  sending = false,
}: {
  token: string;
  // /canvas only: a state to start from, and the form while it sends.
  initialState?: AccountState;
  sending?: boolean;
}) => {
  const t = useTranslations('Account');
  const { state, pending, form, errors, onSubmit } = useAccountForm({
    action: resetPassword,
    schema: passwordReset,
    initialState,
  });
  const busy = pending || sending;
  if (state.status === 'changed')
    return (
      <div className="flex max-w-sm flex-col gap-4">
        <p role="status">{t('changed')}</p>
        <SignInForm />
      </div>
    );
  return (
    <form
      ref={form}
      method="post"
      noValidate
      onSubmit={onSubmit}
      className="flex max-w-sm flex-col gap-4"
    >
      <input type="hidden" name="token" value={token} />
      <AccountField
        label={t('newPassword')}
        name="password"
        type="password"
        autoComplete="new-password"
        maxLength={200}
        required
        hint={t('passwordHint')}
        errors={errors.password}
      />
      {state.status === 'expired' && (
        <p role="alert" className="text-sm text-destructive">
          {t('expired')}{' '}
          <Link href="/account/reset" className="underline underline-offset-4">
            {t('resetAgain')}
          </Link>
        </p>
      )}
      {state.status === 'failed' && (
        <p role="alert" className="text-sm text-destructive">
          {t('failed')}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-fit">
        {busy ? t('saving') : t('savePassword')}
      </Button>
    </form>
  );
};

export default NewPasswordForm;
