import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import SiteHeader from '@/components/shared/header';
import { routing } from '@/i18n/routing';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

// Every storefront page under one header. A client navigation keeps it, with its open menu and the
// admin link's answer.
const ShopLayout = async ({ children, params }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader locale={locale} />
      {children}
    </div>
  );
};

export default ShopLayout;
