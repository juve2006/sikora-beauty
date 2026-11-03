'use client';

import { useLocale, useTranslations } from 'next-intl';
import AccountField from './account-field';
import ResendForm from './resend-form';
import { useAccountForm } from './use-account-form';
import Turnstile from '@/components/shared/consultation/turnstile';
import { register } from '@/lib/actions/account.actions';
import { registerRequest } from '@/lib/validators';
import type { AccountState } from '@/types';
import { Button } from '@/components/ui/button';

// «Створити акаунт». An account opens once its email is confirmed: the form gives way to what to do
// next, and a way to get the letter again.
const RegisterForm = ({
  initialState,
  sending = false,
}: {
  // /canvas only: a state to start from, and the form while it sends.
  initialState?: AccountState;
  sending?: boolean;
}) => {
  const t = useTranslations('Account');
  const locale = useLocale();
  const { state, pending, form, errors, onSubmit } = useAccountForm({
    action: register,
    schema: registerRequest,
    turnstile: true,
    initialState,
  });
  const busy = pending || sending;
  if (state.status === 'sent')
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="wrap-anywhere">
          {t('sent', { email: state.email })}
        </p>
        <ResendForm email={state.email} />
      </div>
    );
  return (
    <form
      ref={form}
      method="post"
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <AccountField
          label={t('firstName')}
          name="firstName"
          autoComplete="given-name"
          maxLength={50}
          required
          errors={errors.firstName}
        />
        <AccountField
          label={t('lastName')}
          name="lastName"
          autoComplete="family-name"
          maxLength={50}
          required
          errors={errors.lastName}
        />
      </div>
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
        autoComplete="new-password"
        maxLength={200}
        required
        hint={t('passwordHint')}
        errors={errors.password}
      />
      <input type="hidden" name="locale" value={locale} />
      <Turnstile attempt={state} />
      {state.status === 'failed' && (
        <p role="alert" className="text-sm text-destructive">
          {t('failed')}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t('consent')}</p>
      <Button type="submit" variant="outline" disabled={busy} className="w-fit">
        {busy ? t('registering') : t('register')}
      </Button>
    </form>
  );
};

export default RegisterForm;
