'use client';

import { cn } from 'cn';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ComponentProps, type ReactNode, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = ComponentProps<typeof Input> & {
  label: string;
  hint?: string;
  // What stands before the field, joined to it: the phone's flag and +380.
  before?: ReactNode;
  // The field's error keys, of `Account.errors`.
  errors?: string[];
};

// A labelled field of an account's form, with its hint and its error; a password with its eye, a
// required field with its star. The ids come from `useId`: /canvas shows the forms several times.
const AccountField = ({
  label,
  hint,
  before,
  errors,
  required,
  type,
  ...input
}: Props) => {
  const t = useTranslations('Account');
  const id = useId();
  const [shown, setShown] = useState(false);
  const key = errors?.[0];
  const password = type === 'password';
  return (
    <div className="flex flex-col gap-2">
      <Label
        htmlFor={id}
        className={cn(
          required && "after:-ml-1 after:text-destructive after:content-['*']",
        )}
      >
        {label}
      </Label>
      <div className="relative flex">
        {before && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-l-lg border border-r-0 border-input px-2.5 text-sm dark:bg-input/30">
            {before}
          </span>
        )}
        <Input
          id={id}
          required={required}
          type={password && shown ? 'text' : type}
          className={cn(before && 'rounded-l-none', password && 'pr-10')}
          {...input}
          {...(key
            ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` }
            : hint
              ? { 'aria-describedby': `${id}-hint` }
              : {})}
        />
        {password && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('showPassword')}
            aria-pressed={shown}
            onClick={() => setShown(!shown)}
            className="absolute top-0 right-0 text-muted-foreground"
          >
            {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        )}
      </div>
      {hint && !key && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {key && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {t(`errors.${key}`)}
        </p>
      )}
    </div>
  );
};

export default AccountField;
