import { test, expect } from '@playwright/test';

test.describe('Community Dashboard', { tag: '@auth' }, () => {
  test('loads and displays community dashboard heading', async ({ page }) => {
    await page.goto('/community-dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    // Page heading
    await expect(page.locator('h2', { hasText: 'Community Dashboard' })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('shows active community display', async ({ page }) => {
    await page.goto('/community-dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    // Active community section should exist
    await expect(page.locator('#active-community-display')).toBeVisible({ timeout: 10_000 });
  });

  test('shows community cards container', async ({ page }) => {
    await page.goto('/community-dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    // Community cards grid should be present
    await expect(page.locator('#community-cards')).toBeVisible({ timeout: 10_000 });
  });

  test('has pagination controls', async ({ page }) => {
    await page.goto('/community-dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    // Pagination should be present (even with 1 page)
    await expect(page.locator('#page-info')).toBeVisible({ timeout: 10_000 });
  });
});
