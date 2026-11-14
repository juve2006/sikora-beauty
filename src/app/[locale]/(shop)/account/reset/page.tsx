import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import NewPasswordForm from '../new-password-form';
import RequestResetForm from '../request-reset-form';
import { routing } from '@/i18n/routing';
import { accountToken } from '@/lib/validators';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

// Rendered on every request and never at build: the layout's header reads Payload, and `next build`
// has no database (RULES.md).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Account' });
  return { title: t('resetTitle'), robots: { index: false } };
}

// «Забули пароль?», and with a letter's token the new password itself. A token the address got wrong
// asks for a new letter, as an old one does.
const ResetPage = async ({ params, searchParams }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const { token } = await searchParams;
  const parsed = accountToken.safeParse(token);
  const t = await getTranslations('Account');
  return (
    <main className="mx-auto w-full max-w-page flex-1 px-4 pb-16 sm:px-6 lg:px-16">
      <h1 className="pt-2 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl lg:pt-8">
        {t('resetTitle')}
      </h1>
      <div className="mt-6">
        {parsed.success ? (
          <NewPasswordForm token={parsed.data} />
        ) : (
          <>
            <p
              role={token ? 'alert' : undefined}
              className="mb-6 max-w-prose text-muted-foreground"
            >
              {token ? t('expired') : t('resetIntro')}
            </p>
            <RequestResetForm />
          </>
        )}
      </div>
    </main>
  );
};

export default ResetPage;
