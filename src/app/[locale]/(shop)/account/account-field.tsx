'use client';

import { useTranslations } from 'next-intl';
import { type ComponentProps, useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = ComponentProps<typeof Input> & {
  label: string;
  hint?: string;
  // The field's error keys, of `Account.errors`.
  errors?: string[];
};

// A labelled field of an account's form, with its hint and its error. The ids come from `useId`:
// /canvas shows the forms several times.
const AccountField = ({ label, hint, errors, ...input }: Props) => {
  const t = useTranslations('Account.errors');
  const id = useId();
  const key = errors?.[0];
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        {...input}
        {...(key
          ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` }
          : hint
            ? { 'aria-describedby': `${id}-hint` }
            : {})}
      />
      {hint && !key && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {key && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {t(key)}
        </p>
      )}
    </div>
  );
};

export default AccountField;
