import { test, expect } from '@playwright/test';

test.describe('Communities Page', () => {
  test('loads for authenticated user', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/communities');
    // Communities page renders a React root or EJS template
    await expect(page).not.toHaveURL(/\/login/);
    // Should show account-related UI
    await expect(page.locator('#accountBtn, #root, nav').first()).toBeVisible({ timeout: 10_000 });
  });
});
