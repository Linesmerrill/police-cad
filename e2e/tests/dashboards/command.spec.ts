import { test, expect } from '@playwright/test';

test.describe('Command Dashboard', () => {
  test('loads for authenticated user', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#cd-mdt-overview, body').first()).toBeVisible({ timeout: 10_000 });
  });
});
