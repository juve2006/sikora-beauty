import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Onest, Playfair_Display } from 'next/font/google';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/constants';
import './globals.css';

// Self-hosted at build time; `cyrillic` carries the Ukrainian letters (ґ, є, і, ї).
const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-onest',
});

// The headings' serif, as the client's mockups set them; its Cyrillic is its own too.
const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-playfair',
});

// Runs before the first paint so the page never flashes the other theme: the shopper's choice
// (saved by ThemeToggle), otherwise the system's. A cookie would make every page dynamic.
const themeScript = `(() => {
  let theme
  try { theme = localStorage.getItem('theme') } catch {}
  if (theme === 'dark' || (!theme && matchMedia('(prefers-color-scheme: dark)').matches))
    document.documentElement.classList.add('dark')
})()`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Next makes canonical and hreflang URLs absolute only against an explicit metadataBase.
export async function generateMetadata() {
  const t = await getTranslations('Metadata');
  return {
    metadataBase: SITE_URL,
    title: { default: t('title'), template: `%s — ${t('title')}` },
    description: t('description'),
  };
}

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

const LocaleLayout = async ({ children, params }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // The theme script changes the class on <html> before React hydrates it.
  return (
    <html
      lang={locale}
      className={`${onest.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
