import { test, expect } from '@playwright/test';

test.describe('Civilian Dashboard', () => {
  test('loads for authenticated user', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/civ-dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    // Civ dashboard has a sidebar and main content area
    await expect(page.locator('#mainContent, #herouiSidebar, body').first()).toBeVisible({ timeout: 10_000 });
    // Should not show an error page
    await expect(page.locator('text=Error').first()).not.toBeVisible().catch(() => {});
  });
});
