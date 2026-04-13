import { test, expect } from '@playwright/test';

test.describe('EMS Dashboard', () => {
  test('loads for authenticated user', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/ems-dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#allCodesSection, #civiliansList, body').first()).toBeVisible({ timeout: 10_000 });
  });
});
