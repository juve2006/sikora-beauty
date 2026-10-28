import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // next-intl imports `next/server` without an extension, which Node's ESM loader cannot
    // resolve; inlined, Vite resolves it.
    server: { deps: { inline: ['next-intl'] } },
  },
})
