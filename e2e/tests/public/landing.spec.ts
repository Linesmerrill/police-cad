import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Landing Page', () => {
  test('loads and displays hero content', async ({ unauthPage: page }) => {
    const response = await page.goto('/', { waitUntil: 'networkidle' });
    // Debug: log what the page returns so we can diagnose CI failures
    const status = response?.status();
    const bodySnippet = await page.locator('body').innerText().catch(() => 'EMPTY');
    console.log(`[DEBUG] Landing page status=${status}, body starts: ${bodySnippet.substring(0, 300)}`);
    await expect(page.locator('nav').first()).toBeVisible({ timeout: 15_000 });
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
