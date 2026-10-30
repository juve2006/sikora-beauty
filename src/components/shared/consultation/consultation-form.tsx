'use client';

import { CircleCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { startTransition, useActionState, useEffect, useRef } from 'react';
import type { ConsultationState } from '@/types';
import { requestConsultation } from '@/lib/actions/consultation.actions';
import { parseConsultationForm } from '@/lib/validators';
import Turnstile, { turnstileToken } from './turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  product?: { id: number; name: string };
  // Closes the dialog after «sent»; /canvas shows the form without one.
  onClose?: () => void;
  // /canvas only: a state to start from, and the form while it sends.
  initialState?: ConsultationState;
  sending?: boolean;
};

const fields = [
  { name: 'name', autoComplete: 'name' },
  { name: 'phone', autoComplete: 'tel', type: 'tel', inputMode: 'tel' },
] as const;

// The form's action: the same schema checks the fields here, before Turnstile's token is spent,
// and in the server action. `read` takes the form's fields anew, as the token may come later.
export const sendConsultation = async (
  previous: ConsultationState,
  read: () => FormData,
): Promise<ConsultationState> => {
  const parsed = parseConsultationForm(read());
  if (!parsed.data) return { status: 'invalid', errors: parsed.errors };
  await turnstileToken(read);
  try {
    return await requestConsultation(previous, read());
  } catch {
    // It never reached the server — offline, or an action a new deploy replaced: a failed
    // request, not an error page, so the shopper keeps what they typed.
    return { status: 'failed' };
  }
};

// The consultation request form. Submitted by hand rather than through `action`: React resets a
// form after its action, and a failed request must keep what the shopper typed.
const ConsultationForm = ({
  product,
  onClose,
  initialState = { status: 'idle' },
  sending = false,
}: Props) => {
  const t = useTranslations('Consultation');
  const locale = useLocale();
  const form = useRef<HTMLFormElement>(null);
  const [state, submit, pending] = useActionState(
    sendConsultation,
    initialState,
  );
  const busy = pending || sending;
  const errors = state.status === 'invalid' ? state.errors : {};

  useEffect(() => {
    if (state.status === 'invalid')
      form.current?.querySelector<HTMLElement>('[aria-invalid=true]')?.focus();
  }, [state]);

  if (state.status === 'sent') {
    return (
      <div role="status" className="flex flex-col items-start gap-3">
        <CircleCheck className="size-8 text-primary" aria-hidden />
        <p className="text-lg font-semibold">{t('sentTitle')}</p>
        <p className="text-muted-foreground">{t('sent')}</p>
        {onClose && (
          <Button variant="outline" className="mt-2" onClick={onClose}>
            {t('close')}
          </Button>
        )}
      </div>
    );
  }

  const error = (name: keyof typeof errors) => {
    const key = errors[name]?.[0];
    return (
      key && (
        <p
          id={`consultation-${name}-error`}
          className="text-sm text-destructive"
        >
          {t(`errors.${key}`)}
        </p>
      )
    );
  };
  const invalid = (name: keyof typeof errors) =>
    errors[name]
      ? {
          'aria-invalid': true,
          'aria-describedby': `consultation-${name}-error`,
        }
      : {};

  return (
    <form
      ref={form}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const element = event.currentTarget;
        startTransition(() => submit(() => new FormData(element)));
      }}
    >
      {product && (
        <p className="text-sm text-muted-foreground">
          {t('about', { product: product.name })}
        </p>
      )}
      {fields.map(({ name, ...input }) => (
        <div key={name} className="flex flex-col gap-2">
          <Label htmlFor={`consultation-${name}`}>{t(name)}</Label>
          <Input
            id={`consultation-${name}`}
            name={name}
            required
            maxLength={name === 'name' ? 100 : 20}
            placeholder={name === 'phone' ? t('phonePlaceholder') : undefined}
            {...input}
            {...invalid(name)}
          />
          {error(name)}
        </div>
      ))}
      <div className="flex flex-col gap-2">
        <Label htmlFor="consultation-message">
          {t('message')}
          <span className="font-normal text-muted-foreground">
            {t('optional')}
          </span>
        </Label>
        <Textarea
          id="consultation-message"
          name="message"
          rows={3}
          maxLength={1000}
          {...invalid('message')}
        />
        {error('message')}
      </div>
      <input type="hidden" name="locale" value={locale} />
      {product && <input type="hidden" name="product" value={product.id} />}
      <Turnstile attempt={state} />
      {state.status === 'failed' && (
        <p role="alert" className="text-sm text-destructive">
          {t('failed')}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t('consent')}</p>
      <Button type="submit" disabled={busy} className="w-full sm:w-fit">
        {busy ? t('sending') : t('submit')}
      </Button>
    </form>
  );
};

export default ConsultationForm;
