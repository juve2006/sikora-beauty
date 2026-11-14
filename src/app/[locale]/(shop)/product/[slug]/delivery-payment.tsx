import { CreditCard, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FREE_DELIVERY_FROM } from '@/lib/constants';
import { formatHryvnias } from '@/lib/utils';

// The checkout's terms (task `cart-and-checkout`): Nova Poshta, free from FREE_DELIVERY_FROM and
// otherwise at its rates, paid on delivery; the goods paid in advance, by transfer or by card, on the
// site or by a link the manager sends (adr-20261109-waybills-and-prepayment-only-start).
const DeliveryPayment = () => {
  const t = useTranslations('Product');
  return (
    <section className="rounded-lg border p-4">
      <h2 className="font-medium">{t('deliveryTitle')}</h2>
      <ul className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground">
        <li className="flex gap-3">
          <Truck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t('delivery', { amount: formatHryvnias(FREE_DELIVERY_FROM) })}
        </li>
        <li className="flex gap-3">
          <CreditCard className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t('payment')}
        </li>
      </ul>
    </section>
  );
};

export default DeliveryPayment;
