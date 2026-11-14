import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

import { routing } from './i18n/routing';
import { MARKED_PHOTOS } from '@/lib/constants';

const intl = createMiddleware(routing);
// Payload owns /admin and /api — whole segments, so a page's /administratsiia keeps its locale;
// files and Next internals need no locale.
const localized = /^\/(?!(?:api|admin)(?:\/|$)|_next|_vercel|.*\..*)/;

// Until the launch the store is closed by one password (adr-20261029-site-password): Vercel guards
// only the Previews. Any user name will do. Without SITE_PASSWORD (locally, on a Preview) no gate.
function hasPassword(request: NextRequest, password: string) {
  const [scheme, encoded = ''] =
    request.headers.get('authorization')?.split(' ') ?? [];
  const credentials = Buffer.from(encoded, 'base64').toString();
  return (
    scheme === 'Basic' &&
    credentials.slice(credentials.indexOf(':') + 1) === password
  );
}

// monobank's webhook carries no password, only its signature, and the crons that reconcile its
// invoices and track Nova Poshta's parcels only their secret, which the endpoints check before they
// read anything (src/lib/monobank.ts, src/lib/novaposhta.ts). next/image asks for a product's
// marked photo with no password either; the photo is as public as its original in Blob
// (src/lib/watermark.ts). Exactly these methods and paths pass the gate.
const hasOwnCheck = ({ method, nextUrl: { pathname } }: NextRequest) =>
  (method === 'POST' && pathname === '/api/mono/webhook') ||
  (method === 'GET' &&
    (pathname === '/api/mono/reconcile' ||
      pathname === '/api/np/track' ||
      pathname.startsWith(`/api${MARKED_PHOTOS}/`)));

export default function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (password && !hasOwnCheck(request) && !hasPassword(request, password)) {
    return new NextResponse('ROSYNASKIN is not open yet.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="ROSYNASKIN"' },
    });
  }
  return localized.test(request.nextUrl.pathname)
    ? intl(request)
    : NextResponse.next();
}

export const config = {
  matcher: '/((?!_next|_vercel).*)',
};
