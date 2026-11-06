import { useTranslations } from 'next-intl';
import CopyButton from './copy-button';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { formatHryvnias } from '@/lib/utils';
import type { PaymentDetails } from '@/types';

type Props = {
  number?: number;
  // A transfer's: the store's account and the sum to send.
  transfer?: { details: PaymentDetails; total: number };
  // A card's, back from monobank: paid, waiting for the bank, or not paid; and where the page is,
  // to look again while it waits.
  card?: 'paid' | 'waiting' | 'failed';
  again?: string;
  // A payment by a link the manager sends — chosen, or what a card became without its invoice.
  link?: boolean;
};

// The thanks for an order: its number when the page found the order, and what happens next — for a
// transfer, where to send the money, each detail with its own copy button; for a card, whether it
// paid.
const OrderPlaced = ({ number, transfer, card, again, link }: Props) => {
  const t = useTranslations('Checkout');
  const c = useTranslations('Cart');
  const p = useTranslations('Product');
  const rows = number &&
    transfer && [
      { label: t('recipient'), value: transfer.details.recipient },
      {
        label: t('iban'),
        value: transfer.details.iban,
        // In fours, as a bank's statement prints it; copied whole.
        shown: transfer.details.iban.replace(/(.{4})(?!$)/g, '$1 '),
      },
      { label: t('code'), value: transfer.details.code },
      {
        label: t('amount'),
        value: formatHryvnias(transfer.total),
        shown: p('price', { amount: formatHryvnias(transfer.total) }),
      },
      { label: t('purpose'), value: t('purposeText', { number }) },
    ];
  return (
    <>
      <h1 className="pt-2 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl lg:pt-8">
        {t('thanks')} {number ? t('placed', { number }) : t('placedNoNumber')}
      </h1>
      {rows ? (
        <section aria-labelledby="transfer-title" className="mt-6 max-w-xl">
          <h2
            id="transfer-title"
            className="text-xl font-semibold tracking-tight"
          >
            {t('transferTitle')}
          </h2>
          <p className="mt-2 text-muted-foreground">{t('transferText')}</p>
          <dl className="mt-4 divide-y rounded-lg border">
            {rows.map(({ label, value, shown }) => (
              <div
                key={label}
                className="grid grid-cols-[1fr_auto] items-center gap-x-3 p-3"
              >
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="col-start-1 font-medium break-words tabular-nums">
                  {shown ?? value}
                </dd>
                <dd className="col-start-2 row-span-2 row-start-1">
                  <CopyButton value={value} label={label} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : (
        <div
          role={card ? 'status' : undefined}
          className="mt-4 flex max-w-prose flex-col gap-2 text-muted-foreground"
        >
          <p>
            {card
              ? {
                  paid: t('cardPaid'),
                  waiting: t('cardWaiting'),
                  failed: t('cardFailed'),
                }[card]
              : t('placedText')}
          </p>
          {link && <p>{t('linkText')}</p>}
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {card === 'waiting' && again && (
          <Button asChild>
            <a href={again}>{t('refresh')}</a>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/brands">{c('brands')}</Link>
        </Button>
      </div>
    </>
  );
};

export default OrderPlaced;
