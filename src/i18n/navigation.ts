import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

export const { Link, getPathname, usePathname, useRouter } = createNavigation(routing)

// A page's canonical address in its language and its address in each language, for hreflang.
export function alternates(href: string, locale: (typeof routing.locales)[number]) {
  return {
    canonical: getPathname({ href, locale }),
    languages: {
      uk: getPathname({ href, locale: 'uk' }),
      en: getPathname({ href, locale: 'en' }),
      'x-default': getPathname({ href, locale: routing.defaultLocale }),
    },
  }
}
