import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Landing Page', () => {
  // Skip in CI — Next.js SSR pages intermittently fail to render in the test environment
  // due to client-side API calls (Stats component) that depend on production data.
  // TODO: Fix by mocking or seeding the stats API data.
  test.skip(({ }, testInfo) => !!process.env.CI, 'Flaky in CI — SSR hydration issue');
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
