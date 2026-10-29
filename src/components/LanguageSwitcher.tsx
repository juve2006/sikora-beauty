'use client'

import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Link, usePathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

// Links, not a menu: a search engine follows them to the other language.
export function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher')
  const current = useLocale()
  const pathname = usePathname()

  return (
    <nav aria-label={t('label')}>
      <ul className="flex gap-1">
        {routing.locales.map((locale) => (
          <li key={locale}>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground aria-[current=true]:bg-accent aria-[current=true]:text-accent-foreground"
            >
              <Link
                href={pathname}
                locale={locale}
                hrefLang={locale}
                lang={locale}
                aria-current={locale === current ? 'true' : undefined}
              >
                {/* The short code fits a 360 px header; the name stays in the link's label. */}
                {t(`${locale}.short`)}
                <span className="sr-only">{` ${t(`${locale}.name`)}`}</span>
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
