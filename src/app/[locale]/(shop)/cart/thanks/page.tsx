import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import OrderPlaced from './order-placed';
import { routing } from '@/i18n/routing';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string | string[] }>;
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

// Where the checkout leads once the order is placed. The number comes from the address — a whole
// number, or none — and the page reads no database: it tells nobody anything about an order.
const ThanksPage = async ({ params, searchParams }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const { order } = await searchParams;
  const number =
    typeof order === 'string' && /^[1-9]\d{0,8}$/.test(order)
      ? Number(order)
      : undefined;
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
      <OrderPlaced number={number} />
    </main>
  );
};

export default ThanksPage;
