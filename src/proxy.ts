import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'

import { routing } from './i18n/routing'

const intl = createMiddleware(routing)
// Payload owns /admin and /api; files and Next internals need no locale.
const localized = /^\/(?!api|admin|_next|_vercel|.*\..*)/

// Until the launch the store is closed by one password (adr-20261029-site-password): Vercel guards
// only the Previews. Any user name will do. Without SITE_PASSWORD (locally, on a Preview) no gate.
function hasPassword(request: NextRequest, password: string) {
  const [scheme, encoded = ''] = request.headers.get('authorization')?.split(' ') ?? []
  const credentials = Buffer.from(encoded, 'base64').toString()
  return scheme === 'Basic' && credentials.slice(credentials.indexOf(':') + 1) === password
}

export default function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD
  if (password && !hasPassword(request, password)) {
    return new NextResponse('Sikora Beauty is not open yet.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Sikora Beauty"' },
    })
  }
  return localized.test(request.nextUrl.pathname) ? intl(request) : NextResponse.next()
}

export const config = {
  matcher: '/((?!_next|_vercel).*)',
}
