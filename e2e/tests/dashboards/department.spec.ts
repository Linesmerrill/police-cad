import { test, expect } from '@playwright/test';

test.describe('Department Dashboard', () => {
  test('loads for authenticated user', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/department-dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#dd-content, body').first()).toBeVisible({ timeout: 10_000 });
  });
});
