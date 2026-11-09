'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import DeliveryFields from './delivery-fields';
import Turnstile, {
  turnstileToken,
} from '@/components/shared/consultation/turnstile';
import { payByCard } from '@/lib/actions/card.actions';
import { placeOrder } from '@/lib/actions/order.actions';
import { dropOrdered } from '@/lib/cart';
import { CHECKOUT_PAYMENTS } from '@/lib/constants';
import { formatHryvnias } from '@/lib/utils';
import { parseOrderForm } from '@/lib/validators';
import { Link, useRouter } from '@/i18n/navigation';
import type {
  CartLine,
  DeliveryAnswer,
  OrderContact,
  OrderField,
  OrderState,
  Payment,
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
  // A transfer is offered when the store's account is filled in, a card when monobank's token is
  // set — each only when every line is in stock.
  transfer?: boolean;
  card?: boolean;
  prepay?: boolean;
  // /canvas only: the payment chosen to start from.
  payment?: Payment;
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
// and in the server action. `read` takes the form's fields anew, as the token may come later. A card
// is paid next, by the placed order's secret: its invoice is the payments' own (`payByCard`). An
// order placed is placed — whatever happens to its invoice, the thank-you page is where it leads.
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
  let placed: OrderState;
  try {
    placed = await placeOrder(previous, read());
  } catch {
    // It never reached the server — offline, or an action a new deploy replaced: a failed order,
    // not an error page, so the shopper keeps what they typed.
    return { status: 'failed' };
  }
  if (placed.status !== 'placed' || parsed.data.payment !== 'card')
    return placed;
  const paid = await payByCard(placed.token, parsed.data.email ?? '').catch(
    () => undefined,
  );
  return paid?.status === 'pay' ? paid : placed;
};

// The checkout under the cart's lines. Submitted by hand rather than through `action`: React resets
// a form after its action, and a failed order must keep what the shopper typed.
const CheckoutForm = ({
  lines,
  total,
  contact,
  transfer = false,
  card = false,
  prepay = false,
  payment,
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
  // The receipt's address is asked only while a card is chosen.
  const [chosen, setChosen] = useState(payment);
  const busy =
    pending || sending || state.status === 'placed' || state.status === 'pay';
  const errors = state.status === 'invalid' ? state.errors : {};
  const offered = CHECKOUT_PAYMENTS.filter(
    (way) =>
      (way !== 'transfer' || (transfer && prepay)) &&
      (way !== 'card' || (card && prepay)),
  );
  const ahead = transfer && card ? 'both' : transfer ? 'transfer' : 'card';

  useEffect(() => {
    // A state to start from is shown, not answered: /canvas would scroll to its invalid form.
    if (state === initialState) return;
    if (state.status === 'invalid')
      form.current?.querySelector<HTMLElement>('[aria-invalid=true]')?.focus();
    if (state.status === 'changed') onChanged?.();
    const ordered = lines.map(({ id }) => id);
    if (state.status === 'pay') {
      // Off to monobank's page: the ordered lines leave the cart as this page goes.
      window.addEventListener('pagehide', () => dropOrdered(ordered), {
        once: true,
      });
      window.location.assign(state.url);
      return;
    }
    if (state.status !== 'placed') return;
    router.replace({
      pathname: '/cart/thanks',
      query: { t: state.token },
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
          {offered.map((way) => (
            <label
              key={way}
              className="flex cursor-pointer gap-3 rounded-lg border p-3 has-checked:border-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="payment"
                value={way}
                defaultChecked={way === payment}
                onChange={() => setChosen(way)}
                className="mt-1 size-4 shrink-0 accent-primary"
                aria-describedby={`${id}-${way}-hint`}
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{t(way)}</span>
                <span
                  id={`${id}-${way}-hint`}
                  className="text-sm text-muted-foreground"
                >
                  {t(`${way}Hint`)}
                </span>
              </span>
            </label>
          ))}
          {(transfer || card) && !prepay && (
            <p className="text-sm text-muted-foreground">
              {t('prepayInStock', { ways: ahead })}
            </p>
          )}
          {error('payment')}
        </fieldset>

        {chosen === 'card' && offered.includes('card') && (
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
              defaultValue={contact?.email}
              aria-describedby={`${id}-email-hint`}
              {...invalid('email')}
            />
            <p
              id={`${id}-email-hint`}
              className="text-sm text-muted-foreground"
            >
              {t('emailHint')}
            </p>
            {error('email')}
          </div>
        )}

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
        {/* In a new tab: leaving would lose what is typed in the form. */}
        <p className="text-xs text-muted-foreground">
          {t.rich('consent', {
            terms: (text) => (
              <Link href="/terms" target="_blank" className="underline">
                {text}
              </Link>
            ),
            privacy: (text) => (
              <Link href="/privacy" target="_blank" className="underline">
                {text}
              </Link>
            ),
          })}
        </p>
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
