import { defineConfig } from 'vitest/config'

export default defineConfig({
  // tests/ imports the code through tsconfig's `@/` alias.
  resolve: { tsconfigPaths: true },
  test: {
    // next-intl imports `next/server` without an extension, which Node's ESM loader cannot
    // resolve; inlined, Vite resolves it.
    server: { deps: { inline: ['next-intl'] } },
  },
})
