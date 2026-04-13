import { test as setup, expect } from '@playwright/test';
import path from 'path';

const userFile = path.join(__dirname, '.auth/user.json');

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

  await page.context().storageState({ path: userFile });
});
