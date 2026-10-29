import { useTranslations } from 'next-intl'

import { SiteHeader } from '@/components/SiteHeader'

export default function HomePage() {
  const t = useTranslations('HomePage')

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-20 pb-16 sm:px-6 sm:pt-32">
        <h1 className="max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-6xl">
          {t('comingSoon')}
        </h1>
      </main>
    </div>
  )
}
