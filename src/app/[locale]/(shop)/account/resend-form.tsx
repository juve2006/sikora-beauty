'use client';

import { useTranslations } from 'next-intl';
import { useAccountForm } from './use-account-form';
import Turnstile from '@/components/shared/consultation/turnstile';
import { resendVerification } from '@/lib/actions/account.actions';
import { emailRequest } from '@/lib/validators';
import type { AccountState } from '@/types';
import { Button } from '@/components/ui/button';

// «Надіслати лист ще раз», for the email the shopper has just typed.
const ResendForm = ({
  email,
  initialState,
  sending = false,
}: {
  email: string;
  // /canvas only: a state to start from, and the form while it sends.
  initialState?: AccountState;
  sending?: boolean;
}) => {
  const t = useTranslations('Account');
  const { state, pending, form, onSubmit } = useAccountForm({
    action: resendVerification,
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
      className="flex flex-col items-start gap-3"
    >
      <input type="hidden" name="email" value={email} />
      <Turnstile attempt={state} />
      {state.status === 'sent' && (
        <p role="status" className="text-sm text-muted-foreground">
          {t('resent')}
        </p>
      )}
      {state.status === 'failed' && (
        <p role="alert" className="text-sm text-destructive">
          {t('failed')}
        </p>
      )}
      <Button type="submit" variant="outline" size="sm" disabled={busy}>
        {busy ? t('resending') : t('resend')}
      </Button>
    </form>
  );
};

export default ResendForm;
