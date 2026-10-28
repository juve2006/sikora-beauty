import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['uk', 'en'],
  defaultLocale: 'uk',
  localePrefix: 'as-needed',
  // `/` is always Ukrainian: with detection on, an English browser or a cookie from a visit to
  // `/en` redirects `/` to `/en`, and the switcher cannot get back.
  localeDetection: false,
})
