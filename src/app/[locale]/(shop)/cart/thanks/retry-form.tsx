'use client';

import { useTranslations } from 'next-intl';
import { useId, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/i18n/navigation';
import { payByCard } from '@/lib/actions/card.actions';
import { cardPayment } from '@/lib/validators';

type Problem = 'emailInvalid' | 'failed';

type Props = {
  token: string;
  email?: string;
  // A state to start from, for /canvas.
  problem?: Problem;
};

// Another try at a card that did not go through: a new invoice, and off to monobank's page. Whatever
// else the server answers — paid after all, a link the manager sends, none made — the page reads the
// order anew. Submitted by hand, as React resets a form after its action and the address is to stay.
const RetryForm = ({ token, email, problem: initial }: Props) => {
  const t = useTranslations('Checkout');
  const router = useRouter();
  // The field's id: /canvas shows the form several times.
  const id = useId();
  const [problem, setProblem] = useState(initial);
  const [leaving, setLeaving] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      noValidate
      className="mt-6 flex max-w-xl flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const address = new FormData(event.currentTarget).get('email');
        const parsed = cardPayment.shape.email.safeParse(address);
        if (!parsed.data) {
          setProblem('emailInvalid');
          return;
        }
        setProblem(undefined);
        start(async () => {
          const paid = await payByCard(token, parsed.data).catch(
            () => undefined,
          );
          if (paid?.status === 'pay') {
            setLeaving(true);
            window.location.assign(paid.url);
            return;
          }
          if (paid?.status !== 'link') setProblem('failed');
          router.refresh();
        });
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-email`}>{t('email')}</Label>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
          defaultValue={email}
          aria-invalid={problem === 'emailInvalid' || undefined}
          aria-describedby={
            problem === 'emailInvalid'
              ? `${id}-email-error`
              : `${id}-email-hint`
          }
        />
        <p id={`${id}-email-hint`} className="text-sm text-muted-foreground">
          {t('emailHint')}
        </p>
        {problem === 'emailInvalid' && (
          <p id={`${id}-email-error`} className="text-sm text-destructive">
            {t('errors.emailInvalid')}
          </p>
        )}
      </div>
      {problem === 'failed' && (
        <p role="alert" className="text-sm text-destructive">
          {t('cardRetryFailed')}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending || leaving}>
          {t('cardRetry')}
        </Button>
      </div>
    </form>
  );
};

export default RetryForm;
