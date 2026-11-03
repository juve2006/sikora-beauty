import { useFormatter, useTranslations } from 'next-intl';
import { formatHryvnias } from '@/lib/utils';
import type { Order } from '@/payload-types';
import { Badge } from '@/components/ui/badge';

type Props = {
  orders: Pick<Order, 'id' | 'createdAt' | 'status' | 'total' | 'lines'>[];
};

// A shopper's orders as the manager keeps them: what they bought at the price they paid, and where
// the order has got to.
const OrderHistory = ({ orders }: Props) => {
  const t = useTranslations('Account');
  const format = useFormatter();
  if (orders.length === 0)
    return <p className="text-muted-foreground">{t('noOrders')}</p>;
  return (
    <ul className="flex flex-col gap-4">
      {orders.map(({ id, createdAt, status, total, lines }) => (
        <li key={id} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">{t('order', { number: id })}</h3>
            <Badge variant="secondary">{t(`statuses.${status}`)}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {format.dateTime(new Date(createdAt), {
              dateStyle: 'long',
              timeZone: 'Europe/Kyiv',
            })}
          </p>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {lines.map((line) => (
              <li key={line.id}>
                {t('quantity', { name: line.name, quantity: line.quantity })}
              </li>
            ))}
          </ul>
          <p className="mt-3 font-medium tabular-nums">
            {t('total', { amount: formatHryvnias(total) })}
          </p>
        </li>
      ))}
    </ul>
  );
};

export default OrderHistory;
