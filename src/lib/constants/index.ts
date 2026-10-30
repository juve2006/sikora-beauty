// Google wants canonical, hreflang and structured-data URLs fully qualified: the site's own address
// to resolve them against. Vercel's own addresses, the dev server locally.
// ponytail: the production host has no VERCEL_* variables; give it a SITE_URL then.
const host = process.env.VERCEL_ENV === 'production' ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL
export const siteUrl = new URL(host ? `https://${host}` : `http://localhost:${process.env.PORT ?? 3000}`)
