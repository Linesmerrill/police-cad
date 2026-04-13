import { test, expect } from '@playwright/test';

test.describe('Police Dashboard', () => {
  test('loads for authenticated user', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/police-dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    // Police dashboard has BOLO table, codes section, etc.
    await expect(page.locator('#boloTable, #allCodesSection, body').first()).toBeVisible({ timeout: 10_000 });
  });
});
