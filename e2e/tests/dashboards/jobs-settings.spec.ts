import { test, expect } from '@playwright/test';

test.describe('Jobs Settings', () => {
  test('renders the page for an authenticated user', { tag: '@auth' }, async ({ page }) => {
    const resp = await page.goto('/jobs-settings');
    await expect(page).not.toHaveURL(/\/login/);
    if (/\/communities$/.test(page.url())) {
      test.skip(true, 'Test user has no active community; covered elsewhere.');
    }
    await expect(resp).toBeTruthy();
    await expect(page.locator('text=Jobs').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#newJobBtn')).toBeVisible();
    await expect(page.locator('#newJobName')).toBeVisible();
  });
});
