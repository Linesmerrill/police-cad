import { test, expect } from '@playwright/test';

test.describe('404 Page Not Found', () => {
  test('renders 404 page for unknown route', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/this-route-definitely-does-not-exist');

    // The 404 page displays a large "404" number
    await expect(page.locator('.error-number-text')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.error-number-text')).toContainText('404');
  });

  test('404 page shows "Page Not Found" heading', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/nonexistent-page-xyz');

    await expect(page.locator('.card h1')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.card h1')).toContainText('Page Not Found');
  });

  test('404 page has Return Home button', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/nonexistent-page-xyz');

    const homeBtn = page.locator('a.btn-primary');
    await expect(homeBtn).toBeVisible({ timeout: 10_000 });
    await expect(homeBtn).toHaveAttribute('href', '/');
  });

  test('404 page has Contact Support link', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/nonexistent-page-xyz');

    const contactBtn = page.locator('a.btn-ghost');
    await expect(contactBtn).toBeVisible({ timeout: 10_000 });
    await expect(contactBtn).toHaveAttribute('href', '/contact-us');
  });
});
