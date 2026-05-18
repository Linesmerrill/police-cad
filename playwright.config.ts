import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const baseURL = process.env.BASE_URL || 'http://localhost:8080';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 2 workers in CI is a conservative speedup over the old 1-worker
  // setup. Specs that mutate shared MongoDB documents (TEST_USER
  // profile / email / deactivation; shared-ID admin_users seeds) must
  // use distinct IDs per spec so their cleanups don't stomp each
  // other across workers. See e2e/helpers/admin-users.ts for the
  // pattern (TEST_LINKED_ADMIN_ID vs TEST_CONSOLE_ADMIN_ID).
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'e2e/playwright-report' }]]
    : [['html', { outputFolder: 'e2e/playwright-report' }]],
  outputDir: 'e2e/test-results',

  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'setup',
      testDir: './e2e',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'e2e/.auth/user.json'),
      },
      dependencies: ['setup'],
    },
  ],

  // No webServer config — start the dev server manually before running tests.
  // In CI, the GitHub Actions workflow starts the server.
  // Locally, run `npm run dev` in a separate terminal.
});
