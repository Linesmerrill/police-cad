import { test as setup, expect } from '@playwright/test';
import path from 'path';

const USER_STATE_PATH = path.join(__dirname, '.auth/user.json');
const ADMIN_STATE_PATH = path.join(__dirname, '.auth/admin.json');

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'testuser@test.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@test.com';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'adminpassword123';

setup('authenticate as regular user', async ({ page }) => {
  // Use the test login bypass route (only available when NODE_ENV=test)
  const response = await page.request.post('/test/login', {
    data: {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    },
  });

  // If test bypass isn't available, fall back to the real login flow
  if (response.status() === 404) {
    await page.goto('/login');
    await page.locator('#email').fill(TEST_USER_EMAIL);
    await page.locator('#password').fill(TEST_USER_PASSWORD);

    // Submit via the hidden form (mirrors real app behavior)
    await page.evaluate(({ email, password }) => {
      const form = document.getElementById('loginForm') as HTMLFormElement;
      const emailInput = document.getElementById('hiddenEmail') as HTMLInputElement;
      const passwordInput = document.getElementById('hiddenPassword') as HTMLInputElement;
      if (form && emailInput && passwordInput) {
        emailInput.value = email;
        passwordInput.value = password;
        form.submit();
      }
    }, { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD });

    await page.waitForURL('**/communities**', { timeout: 30000 });
  }

  await page.context().storageState({ path: USER_STATE_PATH });
});

setup('authenticate as admin', async ({ page }) => {
  // Use the test login bypass route for admin
  const response = await page.request.post('/test/admin-login', {
    data: {
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD,
    },
  });

  // If test bypass isn't available, fall back to real admin login
  if (response.status() === 404) {
    await page.goto('/admin');
    await page.locator('input[name="email"]').fill(TEST_ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(TEST_ADMIN_PASSWORD);
    await page.locator('button[type="submit"], input[type="submit"]').click();
    await page.waitForURL('**/admin/console**', { timeout: 30000 });
  }

  await page.context().storageState({ path: ADMIN_STATE_PATH });
});
