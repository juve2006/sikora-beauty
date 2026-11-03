import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import OrderHistory from './order-history';
import ProfileForm from './profile-form';
import RegisterForm from './register-form';
import SignInForm from './sign-in-form';
import { routing } from '@/i18n/routing';
import { isStaff } from '@/lib/access';
import { signOut } from '@/lib/actions/account.actions';
import { myOrders, sessionUser } from '@/lib/actions/customer.actions';
import { Button } from '@/components/ui/button';

type Props = { params: Promise<{ locale: string }> };

// It reads the session on every request; a cached page never does (RULES.md).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Account' });
  return { title: t('title'), robots: { index: false } };
}

const heading =
  'pt-2 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl lg:pt-8';
const section = 'text-xl font-semibold tracking-tight';

// The way in for everyone, and a shopper's own data and orders. Staff have the admin instead.
const AccountPage = async ({ params }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await sessionUser();
  if (isStaff(user)) redirect('/admin');
  const t = await getTranslations('Account');

  if (user?.collection !== 'customers')
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
        <h1 className={heading}>{t('title')}</h1>
        <p className="mt-2 max-w-prose text-muted-foreground">{t('intro')}</p>
        <div className="mt-8 grid gap-12 lg:grid-cols-2">
          <section aria-labelledby="sign-in">
            <h2 id="sign-in" className={`${section} mb-4`}>
              {t('signIn')}
            </h2>
            <SignInForm />
          </section>
          <section aria-labelledby="register">
            <h2 id="register" className={`${section} mb-4`}>
              {t('register')}
            </h2>
            <RegisterForm />
          </section>
        </div>
      </main>
    );

  const orders = await myOrders(user);
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className={heading}>{t('title')}</h1>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            {t('signOut')}
          </Button>
        </form>
      </div>
      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_2fr]">
        <section aria-labelledby="profile">
          <h2 id="profile" className={`${section} mb-4`}>
            {t('profile')}
          </h2>
          <ProfileForm
            customer={{
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone,
              email: user.email,
            }}
          />
        </section>
        <section aria-labelledby="orders">
          <h2 id="orders" className={`${section} mb-4`}>
            {t('orders')}
          </h2>
          <OrderHistory orders={orders} />
        </section>
      </div>
    </main>
  );
};

export default AccountPage;
