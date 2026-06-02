import { test as setup, expect } from '@playwright/test';
import path from 'path';

const userFile = path.join(__dirname, '.auth/user.json');
const baseURL = process.env.BASE_URL || 'http://localhost:8080';

// First-run feature spotlights (the "LPC Feature Tutorial System") auto-show a
// full-screen modal ~800ms after a community page loads when the user hasn't
// dismissed them. Because the E2E database is ephemeral the test user has never
// dismissed them, so the modal races every interaction and intermittently
// overlays/intercepts clicks (e.g. the community "Promote" action). The tutorial
// system treats an `lpc_tutorial_<key>` cookie as "already dismissed", so we
// seed those cookies into the shared auth state to keep tests deterministic.
// Add a new key here whenever a new auto-registered tutorial is introduced.
const dismissedTutorialKeys = ['rank_system'];

setup('authenticate as user', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'TEST_USER_EMAIL and TEST_USER_PASSWORD env vars are required for auth setup. ' +
      'Set them in e2e/.env.test or pass them directly.'
    );
  }

  await page.goto('/login');
  await expect(page.locator('h1')).toContainText('LOGIN');

  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();

  // The login form submits a hidden form to POST /login via Passport.
  // On success, it redirects to /communities (or the stored redirect).
  await page.waitForURL('**/communities**', { timeout: 15_000 });
  await expect(page).not.toHaveURL(/error/);

  // Suppress first-run onboarding spotlights so they don't overlay pages mid-test.
  await page.context().addCookies(
    dismissedTutorialKeys.map((key) => ({
      name: `lpc_tutorial_${key}`,
      value: '1',
      url: baseURL,
    }))
  );

  await page.context().storageState({ path: userFile });
});
