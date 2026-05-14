import { test, expect } from '@playwright/test';

test.describe('Inbox', () => {
  test('renders the inbox page for an authenticated user', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/inbox');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('text=Inbox').first()).toBeVisible({ timeout: 10_000 });
    // Filter chips
    await expect(page.locator('text=Pending').first()).toBeVisible();
    await expect(page.locator('text=Delinquent').first()).toBeVisible();
    await expect(page.locator('text=Paid').first()).toBeVisible();
  });

  test('filter chip changes the active filter', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/inbox');
    await page.locator('.in-chip', { hasText: 'Paid' }).click();
    await expect(page.locator('.in-chip.active', { hasText: 'Paid' })).toBeVisible();
  });
});
