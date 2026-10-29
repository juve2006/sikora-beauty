import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Agent skills are vendored as they ship; their examples are not this project's code.
  globalIgnores([
    '.next/**',
    'next-env.d.ts',
    'src/payload-types.ts',
    'src/migrations/**',
    '.claude/skills/**',
    '.agents/skills/**',
  ]),
])
