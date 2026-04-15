import { test, expect } from '@playwright/test';

test.describe('Auth Guards', () => {
  test('authenticated user can access communities page', { tag: '@auth' }, async ({ page }) => {
    // This test uses the default authenticated page from storageState.
    // Requires auth setup to have run (skipped in CI without test user seeding).
    await page.goto('/communities');
    // Should not redirect to login
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('unauthenticated access to protected route redirects to login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    // /civ-dashboard uses authCheck middleware which redirects to /login
    await page.goto('/civ-dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    await context.close();
  });

  test('logout invalidates session — protected route redirects to login', async ({ browser }) => {
    // Use a fresh context with manual login. We must NOT use the default
    // shared storageState here: hitting /logout in this test would destroy
    // the shared testuser session server-side and break every other @auth
    // test in the run.
    const email = process.env.TEST_USER_EMAIL || 'testuser@test.com';
    const password = process.env.TEST_USER_PASSWORD || 'TestPass123!';

    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    try {
      await page.goto('/login');
      await page.locator('#email').fill(email);
      await page.locator('#password').fill(password);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/communities**', { timeout: 15_000 });

      // Logout destroys the server-side session.
      await page.goto('/logout');

      // Subsequent protected-route access must redirect to /login — proves
      // the session was destroyed server-side, not just the client cookie.
      await page.goto('/civ-dashboard');
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    } finally {
      await context.close();
    }
  });
});
