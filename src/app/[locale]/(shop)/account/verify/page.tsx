import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import SignInForm from '@/components/shared/account/sign-in-form';
import { routing } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import { sessionUser, waitingLetter } from '@/lib/actions/customer.actions';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

// It reads the session and the token on every request, never at build (RULES.md).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Account' });
  return { title: t('verifyTitle'), robots: { index: false } };
}

// A letter's link: the way in, by email with the letter's address filled in, and its token goes with
// the form, whose right password confirms the email (`signIn`). Signed in, there is something to do
// here only while the letter waits: it may be another account's.
const VerifyPage = async ({ params, searchParams }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const letter = await waitingLetter((await searchParams).token);
  if (!letter && (await sessionUser()))
    redirect(getPathname({ href: '/account', locale }));
  const t = await getTranslations('Account');
  return (
    <main className="mx-auto w-full max-w-page flex-1 px-4 pb-16 sm:px-6">
      <h1 className="pt-2 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl lg:pt-8">
        {t('verifyTitle')}
      </h1>
      <p role={letter ? undefined : 'alert'} className="mt-4 max-w-prose">
        {letter ? t('verifyAsk') : t('verifyInvalid')}
      </p>
      <div className="mt-6 max-w-sm">
        <SignInForm
          byEmail
          toAccount
          token={letter?.token}
          email={letter?.email}
        />
      </div>
    </main>
  );
};

export default VerifyPage;
