import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const baseURL = process.env.BASE_URL || 'http://localhost:8080';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
