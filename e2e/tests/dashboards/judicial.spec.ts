import { test, expect } from '@playwright/test';

test.describe('Judicial Dashboard', () => {
  test('redirects to communities (deprecated)', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/judicial-dashboard');
    // Judicial dashboard is deprecated and redirects to /communities
    await expect(page).toHaveURL(/\/communities/, { timeout: 10_000 });
  });
});
