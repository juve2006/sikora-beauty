'use client';

import { useTranslations } from 'next-intl';
import AccountField from '@/components/shared/account/account-field';
import { useAccountForm } from '@/components/shared/account/use-account-form';
import Turnstile from '@/components/shared/consultation/turnstile';
import { requestReset } from '@/lib/actions/account.actions';
import { emailRequest } from '@/lib/validators';
import type { AccountState } from '@/types';
import { Button } from '@/components/ui/button';

// «Забули пароль?»: the same answer whether there is such an account or not.
const RequestResetForm = ({
  initialState,
  sending = false,
}: {
  // /canvas only: a state to start from, and the form while it sends.
  initialState?: AccountState;
  sending?: boolean;
}) => {
  const t = useTranslations('Account');
  const { state, pending, form, errors, onSubmit } = useAccountForm({
    action: requestReset,
    schema: emailRequest,
    turnstile: true,
    initialState,
  });
  const busy = pending || sending;
  return (
    <form
      ref={form}
      method="post"
      noValidate
      onSubmit={onSubmit}
      className="flex max-w-sm flex-col gap-4"
    >
      <AccountField
        label={t('email')}
        name="email"
        type="email"
        autoComplete="email"
        maxLength={254}
        required
        errors={errors.email}
      />
      <Turnstile attempt={state} />
      {state.status === 'sent' && <p role="status">{t('resetSent')}</p>}
      {state.status === 'failed' && (
        <p role="alert" className="text-sm text-destructive">
          {t('failed')}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-fit">
        {busy ? t('resending') : t('resetSend')}
      </Button>
    </form>
  );
};

export default RequestResetForm;
