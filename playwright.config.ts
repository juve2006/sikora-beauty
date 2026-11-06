import { defineConfig, devices } from '@playwright/test';

// The checkout, the care finder and the accounts end to end (tests/e2e): `npm run build`, then `npm run test:e2e`, with DATABASE_URL
// and PAYLOAD_SECRET of a throwaway database that has its migrations, `seed:catalog` and
// tests/e2e/seed.ts — CI's `e2e` and `accounts` jobs do all of it. The orders it places stay there.
export default defineConfig({
  testDir: 'tests/e2e',
  // One production server and one database for every test.
  workers: 1,
  forbidOnly: !!process.env.CI,
  use: { baseURL: 'http://localhost:3200', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'phone',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 800 },
      },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: [
    { command: 'node tests/e2e/novaposhta-stub.mjs', port: 4010 },
    { command: 'node tests/e2e/google-stub.mjs', port: 4011 },
    { command: 'node tests/e2e/mono-stub.mjs', port: 4012 },
    {
      command: 'npm start -- -p 3200',
      port: 3200,
      env: {
        NOVA_POSHTA_API_URL: 'http://127.0.0.1:4010/',
        GOOGLE_CLIENT_ID: 'e2e-client',
        GOOGLE_CLIENT_SECRET: 'e2e-secret',
        GOOGLE_STUB_URL: 'http://127.0.0.1:4011/',
        MONO_TOKEN: 'e2e-mono',
        MONO_API_URL: 'http://127.0.0.1:4012/',
        // SITE_URL: Google's way back has to name this server.
        PORT: '3200',
      },
    },
  ],
});
