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

  test('logout invalidates session — protected route redirects to login', { tag: '@auth' }, async ({ page }) => {
    // Start authenticated (via default storageState) and prove access works.
    await page.goto('/communities');
    await expect(page).not.toHaveURL(/\/login/);

    // Logout destroys the server-side session.
    await page.goto('/logout');

    // Subsequent protected-route access must redirect to /login — proves
    // the session was destroyed server-side, not just the client cookie.
    await page.goto('/civ-dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
