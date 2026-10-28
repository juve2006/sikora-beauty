import { useTranslations } from 'next-intl'

import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export default function HomePage() {
  const t = useTranslations('HomePage')

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('comingSoon')}</p>
      <LanguageSwitcher />
    </main>
  )
}
