import { test, expect } from '@playwright/test';

test.describe('Dispatch Dashboard', () => {
  test('loads for authenticated user', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/dispatch-dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#callTable, #officerListTable, body').first()).toBeVisible({ timeout: 10_000 });
  });
});
