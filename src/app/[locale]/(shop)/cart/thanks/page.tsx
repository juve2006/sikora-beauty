import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import OrderPlaced from './order-placed';
import { routing } from '@/i18n/routing';
import {
  getPaymentDetails,
  getPlacedOrder,
} from '@/lib/actions/payment.actions';
import { returnToken } from '@/lib/validators';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
};

// Rendered on every request and never at build: the layout's header reads Payload, and `next build`
// has no database (RULES.md).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Checkout' });
  return { title: t('thanks'), robots: { index: false } };
}

// Where the checkout leads once the order is placed. The address carries the order's secret, never
// its number: by the secret the page reads the order's number, sum and payment, and for a transfer
// still to be paid the store's account. Without it, or with one no order has, the thanks name no order: a number
// typed in the address tells nobody anything.
const ThanksPage = async ({ params, searchParams }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const token = returnToken.safeParse((await searchParams).t).data;
  const order = token ? await getPlacedOrder(token) : undefined;
  const details =
    order?.payment === 'transfer' && order.payable
      ? await getPaymentDetails()
      : undefined;
  return (
    <main className="mx-auto w-full max-w-page flex-1 px-4 pb-16 sm:px-6">
      <OrderPlaced
        number={order?.number}
        transfer={order && details && { details, total: order.total }}
      />
    </main>
  );
};

export default ThanksPage;
