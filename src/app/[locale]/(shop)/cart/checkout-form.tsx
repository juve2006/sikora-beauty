'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react';
import DeliveryFields from './delivery-fields';
import Turnstile, {
  turnstileToken,
} from '@/components/shared/consultation/turnstile';
import { placeOrder } from '@/lib/actions/order.actions';
import { dropOrdered } from '@/lib/cart';
import { PAYMENTS } from '@/lib/constants';
import { formatHryvnias } from '@/lib/utils';
import { parseOrderForm } from '@/lib/validators';
import { useRouter } from '@/i18n/navigation';
import type {
  CartLine,
  DeliveryAnswer,
  OrderContact,
  OrderField,
  OrderState,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  // What can be ordered, and the sum the shopper is shown: the server compares it with its own.
  lines: CartLine[];
  total: number;
  // A signed-in shopper's name and phone, to start from.
  contact?: OrderContact | null;
  // The cart changed under the order: its cards are read again.
  onChanged?: () => void;
  // /canvas only: a state to start from, the form while it sends, and the delivery search's answer.
  initialState?: OrderState;
  sending?: boolean;
  delivery?: { typed: string; answer: DeliveryAnswer };
};

const contacts = [
  { name: 'firstName', autoComplete: 'given-name', maxLength: 50 },
  { name: 'lastName', autoComplete: 'family-name', maxLength: 50 },
] as const;

// The form's action: the same schema checks the fields here, before Turnstile's token is spent,
// and in the server action. `read` takes the form's fields anew, as the token may come later.
export const sendOrder = async (
  previous: OrderState,
  read: () => FormData,
): Promise<OrderState> => {
  const parsed = parseOrderForm(read());
  if (!parsed.data)
    return Object.keys(parsed.errors).length > 0
      ? { status: 'invalid', errors: parsed.errors }
      : { status: 'failed' };
  await turnstileToken(read);
  try {
    return await placeOrder(previous, read());
  } catch {
    // It never reached the server — offline, or an action a new deploy replaced: a failed order,
    // not an error page, so the shopper keeps what they typed.
    return { status: 'failed' };
  }
};

// The checkout under the cart's lines. Submitted by hand rather than through `action`: React resets
// a form after its action, and a failed order must keep what the shopper typed.
const CheckoutForm = ({
  lines,
  total,
  contact,
  onChanged,
  initialState = { status: 'idle' },
  sending = false,
  delivery,
}: Props) => {
  const t = useTranslations('Checkout');
  const p = useTranslations('Product');
  const locale = useLocale();
  const router = useRouter();
  // The fields' ids: /canvas shows the form several times.
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [state, submit, pending] = useActionState(sendOrder, initialState);
  const busy = pending || sending || state.status === 'placed';
  const errors = state.status === 'invalid' ? state.errors : {};

  useEffect(() => {
    // A state to start from is shown, not answered: /canvas would scroll to its invalid form.
    if (state === initialState) return;
    if (state.status === 'invalid')
      form.current?.querySelector<HTMLElement>('[aria-invalid=true]')?.focus();
    if (state.status === 'changed') onChanged?.();
    if (state.status !== 'placed') return;
    const ordered = lines.map(({ id }) => id);
    router.replace({
      pathname: '/cart/thanks',
      query: { order: state.number },
    });
    // The ordered lines leave the cart as the page is left: sooner, it would empty under the form.
    return () => dropOrdered(ordered);
    // `lines` and `onChanged` follow the cart; the work is for a new answer only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const error = (name: OrderField): ReactNode => {
    const key = errors[name]?.[0];
    return (
      key && (
        <p id={`${id}-${name}-error`} className="text-sm text-destructive">
          {t(`errors.${key}`)}
        </p>
      )
    );
  };
  const invalid = (name: OrderField) =>
    errors[name]
      ? { 'aria-invalid': true, 'aria-describedby': `${id}-${name}-error` }
      : {};

  return (
    <section aria-labelledby={`${id}-title`} className="mt-10">
      <h2 id={`${id}-title`} className="text-xl font-semibold tracking-tight">
        {t('title')}
      </h2>
      <form
        ref={form}
        noValidate
        className="mt-4 flex max-w-xl flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          const element = event.currentTarget;
          startTransition(() => submit(() => new FormData(element)));
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {contacts.map(({ name, ...input }) => (
              <div key={name} className="flex flex-col gap-2">
                <Label htmlFor={`${id}-${name}`}>{t(name)}</Label>
                <Input
                  id={`${id}-${name}`}
                  name={name}
                  required
                  defaultValue={contact?.[name]}
                  {...input}
                  {...invalid(name)}
                />
                {error(name)}
              </div>
            ))}
          </div>
          <p className="-mt-2 text-sm text-muted-foreground">
            {t('recipientHint')}
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-phone`}>{t('phone')}</Label>
            <Input
              id={`${id}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              maxLength={20}
              placeholder={t('phonePlaceholder')}
              defaultValue={contact?.phone}
              {...invalid('phone')}
            />
            {error('phone')}
          </div>
        </div>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-4 font-medium">{t('delivery')}</legend>
          <DeliveryFields
            errors={{
              settlement: errors.settlement,
              warehouse: errors.warehouse,
            }}
            sample={delivery}
          />
          <p className="text-sm text-muted-foreground">{t('rates')}</p>
        </fieldset>

        <fieldset
          className="flex flex-col gap-3"
          aria-describedby={errors.payment ? `${id}-payment-error` : undefined}
        >
          <legend className="mb-3 font-medium">{t('payment')}</legend>
          {PAYMENTS.map((payment) => (
            <label
              key={payment}
              className="flex cursor-pointer gap-3 rounded-lg border p-3 has-checked:border-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="payment"
                value={payment}
                className="mt-1 size-4 shrink-0 accent-primary"
                aria-describedby={`${id}-${payment}-hint`}
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{t(payment)}</span>
                <span
                  id={`${id}-${payment}-hint`}
                  className="text-sm text-muted-foreground"
                >
                  {t(`${payment}Hint`)}
                </span>
              </span>
            </label>
          ))}
          {error('payment')}
        </fieldset>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-comment`}>
            {t('comment')}
            <span className="font-normal text-muted-foreground">
              {t('optional')}
            </span>
          </Label>
          <Textarea
            id={`${id}-comment`}
            name="comment"
            rows={3}
            maxLength={500}
            {...invalid('comment')}
          />
          {error('comment')}
        </div>

        <input type="hidden" name="lines" value={JSON.stringify(lines)} />
        <input type="hidden" name="total" value={total} />
        <input type="hidden" name="locale" value={locale} />
        <Turnstile attempt={state} />
        {(state.status === 'changed' || state.status === 'failed') && (
          <p role="alert" className="text-sm text-destructive">
            {t(state.status)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{t('consent')}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="submit"
            size="lg"
            disabled={busy}
            className="w-full sm:w-fit"
          >
            {busy ? t('sending') : t('submit')}
            {/* A span, not ProductPrice's paragraph, inside a button; the space keeps the name's
                words apart for a reader. */}
            {!busy && (
              <>
                {' '}
                <span className="font-normal tabular-nums opacity-80">
                  {p('price', { amount: formatHryvnias(total) })}
                </span>
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground">{t('call')}</p>
        </div>
      </form>
    </section>
  );
};

export default CheckoutForm;
