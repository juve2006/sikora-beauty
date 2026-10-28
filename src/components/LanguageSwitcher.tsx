'use client'

import { useLocale, useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

export function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher')
  const current = useLocale()
  const pathname = usePathname()

  return (
    <nav aria-label={t('label')}>
      <ul>
        {routing.locales.map((locale) => (
          <li key={locale}>
            <Link
              href={pathname}
              locale={locale}
              hrefLang={locale}
              aria-current={locale === current ? 'true' : undefined}
            >
              {t(locale)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
