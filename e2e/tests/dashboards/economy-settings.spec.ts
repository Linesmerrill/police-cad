import { test, expect } from '@playwright/test';

test.describe('Economy Settings', () => {
  test('renders the settings page for an authenticated user', { tag: '@auth' }, async ({ page }) => {
    const resp = await page.goto('/economy-settings');
    await expect(page).not.toHaveURL(/\/login/);
    if (/\/communities$/.test(page.url())) {
      test.skip(true, 'Test user has no active community; covered elsewhere.');
    }
    await expect(page.locator('text=Economy Settings').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Enable economy for this community').first()).toBeVisible();
    await expect(page.locator('text=Fines').first()).toBeVisible();
  });
});
