import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const baseURL = process.env.BASE_URL || 'http://localhost:8080';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never', outputFolder: path.join(__dirname, 'playwright-report') }], ['github']]
    : [['html', { open: 'on-failure', outputFolder: path.join(__dirname, 'playwright-report') }]],
  outputDir: path.join(__dirname, 'test-results'),

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    // Auth setup — runs first, saves storageState files
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Smoke tests — no auth needed
    {
      name: 'smoke',
      testMatch: /smoke\/.+\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Public page tests — no auth needed
    {
      name: 'public',
      testMatch: /public\/.+\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Auth flow tests — no prior auth state needed
    {
      name: 'auth',
      testMatch: /auth\/.+\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Protected page tests — require logged-in user
    {
      name: 'protected',
      testMatch: /protected\/.+\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, '.auth/user.json'),
      },
    },

    // Dashboard tests — require logged-in user
    {
      name: 'dashboards',
      testMatch: /dashboards\/.+\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, '.auth/user.json'),
      },
    },

    // Admin tests — require admin storageState
    {
      name: 'admin',
      testMatch: /admin\/.+\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, '.auth/admin.json'),
      },
    },

    // Accessibility tests — no auth needed
    {
      name: 'a11y',
      testMatch: /accessibility\/.+\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Mobile viewport smoke tests
    {
      name: 'mobile',
      testMatch: /smoke\/public-pages\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: 'test',
      PORT: '8080',
    },
  },
});
