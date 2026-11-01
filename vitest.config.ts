import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  // tests/ imports the code through tsconfig's `@/` alias.
  resolve: { tsconfigPaths: true },
  test: {
    // Playwright's: they need a server and a browser (playwright.config.ts).
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    // next-intl imports `next/server` without an extension, which Node's ESM loader cannot
    // resolve; inlined, Vite resolves it.
    server: { deps: { inline: ['next-intl'] } },
  },
})
