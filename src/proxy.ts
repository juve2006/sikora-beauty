import createMiddleware from 'next-intl/middleware'

import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Payload owns /admin and /api; files and Next internals need no locale.
  matcher: '/((?!api|admin|_next|_vercel|.*\\..*).*)',
}
