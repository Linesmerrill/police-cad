import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Landing Page', () => {
  test('loads and displays hero content', async ({ unauthPage: page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('nav').first()).toBeVisible({ timeout: 15_000 });
    // Hero section contains the app name
    await expect(page.locator('h1, h2, [class*="hero"]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('displays navigation links', async ({ unauthPage: page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('nav')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Login', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('displays footer', async ({ unauthPage: page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('footer').first()).toBeVisible({ timeout: 15_000 });
  });
});
