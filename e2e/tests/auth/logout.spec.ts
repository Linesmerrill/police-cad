import { test, expect } from '@playwright/test';

test.describe('Auth Guards', () => {
  test('authenticated user can access communities page', async ({ page }) => {
    // This test uses the default authenticated page from storageState
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
});
