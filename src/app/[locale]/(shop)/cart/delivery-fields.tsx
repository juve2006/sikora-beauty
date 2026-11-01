'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useState } from 'react';
import {
  findSettlements,
  findWarehouses,
} from '@/lib/actions/delivery.actions';
import type { DeliveryAnswer, DeliveryOption } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// A pause in typing before Nova Poshta is asked.
const DELAY = 300;

type Errors = Partial<Record<'settlement' | 'warehouse', string[]>>;

// One search field over Nova Poshta: what the shopper types asks the server after a pause, the
// matches come as buttons under it, and the one they press is the field's value — sent in hidden
// fields with its ref. A new letter drops the choice. `onUnavailable` when Nova Poshta does not
// answer.
const Search = ({
  name,
  label,
  placeholder,
  disabled = false,
  minimum,
  find,
  chosen,
  onChoose,
  onUnavailable,
  error,
  sample,
}: {
  name: 'settlement' | 'warehouse';
  label: string;
  placeholder: string;
  disabled?: boolean;
  // The fewest letters worth a question: none for the warehouses of a chosen settlement.
  minimum: number;
  find: (query: string) => Promise<DeliveryAnswer>;
  chosen: DeliveryOption | null;
  onChoose: (option: DeliveryOption | null) => void;
  onUnavailable: () => void;
  error?: string;
  sample?: { typed: string; answer: DeliveryAnswer };
}) => {
  const t = useTranslations('Checkout');
  const id = `checkout-${name}`;
  const status = useId();
  const [typed, setTyped] = useState(sample?.typed ?? '');
  // The last answer, and the query it answers.
  const [found, setFound] = useState<{
    query: string;
    answer: DeliveryAnswer;
  } | null>(
    sample ? { query: sample.typed.trim(), answer: sample.answer } : null,
  );
  const query = typed.trim();
  const asking = !disabled && !chosen && query.length >= minimum;

  useEffect(() => {
    if (!asking || found?.query === query) return;
    let current = true;
    const timer = setTimeout(() => {
      find(query).then(
        (answer) => {
          if (!current) return;
          setFound({ query, answer });
          if (answer.status === 'unavailable') onUnavailable();
        },
        () => current && onUnavailable(),
      );
    }, DELAY);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [asking, query, found, find, onUnavailable]);

  const answer = asking && found?.query === query ? found.answer : null;
  const options = answer?.status === 'found' ? answer.options : [];
  const message = !asking
    ? ''
    : !answer
      ? t('searching')
      : answer.status === 'latin'
        ? t('latin')
        : options.length === 0
          ? t('nothing')
          : t('found', { count: options.length });

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={chosen?.label ?? typed}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={chosen ? undefined : 50}
        aria-describedby={error ? `${status} ${id}-error` : status}
        aria-invalid={error ? true : undefined}
        onChange={(event) => {
          setTyped(event.target.value);
          if (chosen) onChoose(null);
        }}
      />
      <input type="hidden" name={name} value={chosen?.label ?? ''} />
      <input type="hidden" name={`${name}Ref`} value={chosen?.ref ?? ''} />
      <p
        id={status}
        aria-live="polite"
        className="text-sm text-muted-foreground"
      >
        {message}
      </p>
      {options.length > 0 && (
        <ul className="max-h-64 overflow-y-auto rounded-lg border">
          {options.map((option) => (
            <li key={option.ref}>
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                onClick={() => {
                  setTyped(option.label);
                  onChoose(option);
                  document.getElementById(id)?.focus();
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {t(`errors.${error}`)}
        </p>
      )}
    </div>
  );
};

// The checkout's settlement and NP warehouse: chosen from Nova Poshta's search, or — once it does
// not answer, with or without a key — typed by hand, for the manager to check on the call
// (task `cart-and-checkout`). Typed by hand, they go without refs.
const DeliveryFields = ({
  errors = {},
  sample,
}: {
  errors?: Errors;
  // /canvas only: what was typed for the settlement and what Nova Poshta answered.
  sample?: { typed: string; answer: DeliveryAnswer };
}) => {
  const t = useTranslations('Checkout');
  const [manual, setManual] = useState(sample?.answer.status === 'unavailable');
  const [settlement, setSettlement] = useState<DeliveryOption | null>(null);
  const [warehouse, setWarehouse] = useState<DeliveryOption | null>(null);
  // Stable, so a search does not start over when the form re-renders.
  const unavailable = useCallback(() => setManual(true), []);
  const findHere = useCallback(
    (query: string) => findWarehouses(settlement?.ref ?? '', query),
    [settlement],
  );
  // A search typed in but never chosen is told so, rather than «fill in this field».
  const error = (name: keyof Errors, chosen: DeliveryOption | null) => {
    const key = errors[name]?.[0];
    return key === 'required' && !manual && !chosen ? 'choose' : key;
  };

  if (manual)
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-sm">
          {t('unavailable')}
        </p>
        {(['settlement', 'warehouse'] as const).map((name) => {
          const key = errors[name]?.[0];
          return (
            <div key={name} className="flex flex-col gap-2">
              <Label htmlFor={`checkout-${name}`}>{t(name)}</Label>
              <Input
                id={`checkout-${name}`}
                name={name}
                defaultValue={
                  name === 'settlement' ? (settlement?.label ?? '') : ''
                }
                maxLength={200}
                autoComplete={name === 'settlement' ? 'address-level2' : 'off'}
                aria-invalid={key ? true : undefined}
                aria-describedby={key ? `checkout-${name}-error` : undefined}
              />
              {key && (
                <p
                  id={`checkout-${name}-error`}
                  className="text-sm text-destructive"
                >
                  {t(`errors.${key}`)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <Search
        name="settlement"
        label={t('settlement')}
        placeholder={t('settlementPlaceholder')}
        minimum={2}
        find={findSettlements}
        chosen={settlement}
        onChoose={(option) => {
          setSettlement(option);
          setWarehouse(null);
        }}
        onUnavailable={unavailable}
        error={error('settlement', settlement)}
        sample={sample}
      />
      {/* A new settlement is a new search: its key starts it afresh. */}
      <Search
        key={settlement?.ref ?? 'none'}
        name="warehouse"
        label={t('warehouse')}
        placeholder={
          settlement ? t('warehousePlaceholder') : t('chooseSettlement')
        }
        disabled={!settlement}
        minimum={0}
        find={findHere}
        chosen={warehouse}
        onChoose={setWarehouse}
        onUnavailable={unavailable}
        // Shut until a settlement is chosen: the settlement's error says what to do first.
        error={settlement ? error('warehouse', warehouse) : undefined}
      />
    </div>
  );
};

export default DeliveryFields;
