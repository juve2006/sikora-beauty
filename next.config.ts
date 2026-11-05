import { withPayload } from '@payloadcms/next/withPayload'
import { withSentryConfig } from '@sentry/nextjs/config'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const withNextIntl = createNextIntlPlugin()
// The Blob store's id, read from its token as @payloadcms/storage-vercel-blob reads it; none locally.
const blobStore = process.env.BLOB_READ_WRITE_TOKEN?.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i)?.[1]?.toLowerCase()

const nextConfig: NextConfig = {
  // AGENTS.md is written by people and Jig; `next dev` would otherwise add its own block.
  agentRules: false,
  // src/proxy.ts sees every request, /api included, and Next cuts a body it buffers there at 10 MB:
  // a phone photo uploaded through the server (locally, on the production host) would arrive cut.
  experimental: { proxyClientMaxBodySize: '50mb' },
  // Product photos: our Blob store on Vercel, Payload's files on the local disk. Only our store's
  // host — a wildcard would let anyone have their images resized here.
  images: {
    remotePatterns: blobStore ? [new URL(`https://${blobStore}.public.blob.vercel-storage.com/**`)] : [],
    localPatterns: [{ pathname: '/api/media/file/**', search: '' }],
  },
  // Only a session the admin refuses lands at the first, which is a shopper's. Payload's page offers a
  // log-out that cannot end their session; their account has one that does. The second is Payload's
  // page for a letter's link, which confirms the email on a GET, without the password. Staff ask for a
  // reset letter at the store's form, behind Turnstile: the admin's own page posts to a closed REST route.
  redirects: async () => [
    { source: '/admin/unauthorized', destination: '/account', permanent: false },
    { source: '/admin/customers/verify/:token', destination: '/account/verify?token=:token', permanent: false },
    { source: '/admin/forgot', destination: '/account/reset', permanent: false },
  ],
  // From Payload's template: its sources import `.js` paths that are `.ts` files.
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

// Only for readable stacks: source maps go to Sentry and are deleted from the build, and without the
// token (locally, in CI, on a Preview) none are made.
const config = withSentryConfig(withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false }), {
  org: 'sikora-bw',
  project: 'sikora-beauty',
  silent: true,
  telemetry: false,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
})

// It also tags every dynamic page with Sentry's trace id, public key and release, for tracing this site
// does not do.
delete config.experimental?.clientTraceMetadata

export default config
