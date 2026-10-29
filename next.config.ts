import { withPayload } from '@payloadcms/next/withPayload'
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

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
