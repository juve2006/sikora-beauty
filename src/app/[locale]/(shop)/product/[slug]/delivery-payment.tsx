import { CreditCard, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';

// General terms until the owner settles them (spec `sikora-beauty`, open question 5): launch step 1
// takes cash on delivery or a payment link the manager sends.
const DeliveryPayment = () => {
  const t = useTranslations('Product');
  return (
    <section className="rounded-lg border p-4">
      <h2 className="font-medium">{t('deliveryTitle')}</h2>
      <ul className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground">
        <li className="flex gap-3">
          <Truck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t('delivery')}
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
