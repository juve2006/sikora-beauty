import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import SiteFooter from '@/components/shared/footer';
import SiteHeader from '@/components/shared/header';
import { routing } from '@/i18n/routing';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

// Every storefront page between one header and one footer. A client navigation keeps them, with the
// open menu and the admin link's answer.
const ShopLayout = async ({ children, params }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader locale={locale} />
      {children}
      <SiteFooter locale={locale} />
    </div>
  );
};

export default ShopLayout;
