import { test, expect } from '@playwright/test';

test.describe('Community Dashboard', { tag: '@auth' }, () => {
  // Uses the /communities EJS page (the main community management page)
  test('loads communities page for authenticated user', async ({ page }) => {
    await page.goto('/communities');
    await expect(page).not.toHaveURL(/\/login/);

    // Page renders with navigation and account elements
    await expect(page.locator('nav').first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows account button in navbar', async ({ page }) => {
    await page.goto('/communities');
    await expect(page).not.toHaveURL(/\/login/);

    await expect(page.locator('#accountBtn')).toBeVisible({ timeout: 10_000 });
  });

  test('has notification bell', async ({ page }) => {
    await page.goto('/communities');
    await expect(page).not.toHaveURL(/\/login/);

    // Notification bell should be present in the navbar
    await expect(
      page.locator('#notificationBtn, #notification-symbol, [data-testid="notification-bell"]').first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
