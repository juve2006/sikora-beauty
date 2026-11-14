import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import CartList from './cart-list';
import { routing } from '@/i18n/routing';
import { currentCustomer } from '@/lib/actions/customer.actions';
import { getPaymentDetails } from '@/lib/actions/payment.actions';
import { cardEnabled } from '@/lib/monobank';

type Props = { params: Promise<{ locale: string }> };

// Rendered on every request and never at build: the layout's header reads Payload, and `next build`
// has no database (RULES.md).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Cart' });
  // One browser's own cart: nothing for a search engine.
  return { title: t('title'), robots: { index: false } };
}

// The cart this browser keeps, and the checkout under it. The server does not know the cart; the
// list asks for its products' cards once it runs. It does know a shopper who is signed in, whose
// name, phone and address fill in the form, whether the store's account is there to take a
// transfer, and whether monobank takes a card.
const CartPage = async ({ params }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations('Cart');
  const [customer, details] = await Promise.all([
    currentCustomer(),
    getPaymentDetails(),
  ]);
  return (
    <main className="mx-auto w-full max-w-page flex-1 px-4 pb-16 sm:px-6 lg:px-16">
      <h1 className="pt-2 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl lg:pt-8">
        {t('title')}
      </h1>
      <CartList
        contact={
          customer && {
            firstName: customer.firstName ?? '',
            lastName: customer.lastName ?? '',
            phone: customer.phone ?? undefined,
            email: customer.email,
          }
        }
        transfer={Boolean(details)}
        card={cardEnabled()}
      />
    </main>
  );
};

export default CartPage;
