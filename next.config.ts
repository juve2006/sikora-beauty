import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  // AGENTS.md is written by people and Jig; `next dev` would otherwise add its own block.
  agentRules: false,
  // src/proxy.ts sees every request, /api included, and Next cuts a body it buffers there at 10 MB:
  // a phone photo uploaded through the server (locally, on the production host) would arrive cut.
  experimental: { proxyClientMaxBodySize: '50mb' },
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
