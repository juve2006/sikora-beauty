'use client';

import { useTranslations } from 'next-intl';
import AccountField from '@/components/shared/account/account-field';
import { useAccountForm } from '@/components/shared/account/use-account-form';
import { updateProfile } from '@/lib/actions/account.actions';
import { profileUpdate } from '@/lib/validators';
import type { Customer } from '@/payload-types';
import type { AccountState } from '@/types';
import { Button } from '@/components/ui/button';

// A shopper's own name and phone, which fill in the checkout. The email is how they sign in: it is
// shown, and only the owner changes it.
const ProfileForm = ({
  customer,
  initialState,
  sending = false,
}: {
  customer: Pick<Customer, 'firstName' | 'lastName' | 'phone' | 'email'>;
  // /canvas only: a state to start from, and the form while it sends.
  initialState?: AccountState;
  sending?: boolean;
}) => {
  const t = useTranslations('Account');
  const { state, pending, form, errors, onSubmit } = useAccountForm({
    action: updateProfile,
    schema: profileUpdate,
    initialState,
  });
  const busy = pending || sending;
  return (
    <form
      ref={form}
      method="post"
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
    >
      <p className="text-sm wrap-anywhere text-muted-foreground">
        {t('email')}: {customer.email}
      </p>
      <AccountField
        label={t('firstName')}
        name="firstName"
        autoComplete="given-name"
        maxLength={50}
        required
        defaultValue={customer.firstName}
        errors={errors.firstName}
      />
      <AccountField
        label={t('lastName')}
        name="lastName"
        autoComplete="family-name"
        maxLength={50}
        required
        defaultValue={customer.lastName}
        errors={errors.lastName}
      />
      <AccountField
        label={t('phone')}
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        maxLength={20}
        placeholder={t('phonePlaceholder')}
        defaultValue={customer.phone ?? ''}
        errors={errors.phone}
      />
      {state.status === 'saved' && (
        <p role="status" className="text-sm text-muted-foreground">
          {t('saved')}
        </p>
      )}
      {state.status === 'failed' && (
        <p role="alert" className="text-sm text-destructive">
          {t('failed')}
        </p>
      )}
      <Button type="submit" variant="outline" disabled={busy} className="w-fit">
        {busy ? t('saving') : t('save')}
      </Button>
    </form>
  );
};

export default ProfileForm;
