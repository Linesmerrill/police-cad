import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../fixtures/test-data';

test.describe('Public Pages Smoke Tests', () => {
  // Next.js dev mode compiles pages on first access — allow extra time
  test.setTimeout(60000);

  for (const page of PUBLIC_PAGES) {
    test(`${page.path} loads successfully`, async ({ page: pw }) => {
      const errors: string[] = [];
      pw.on('pageerror', (err) => errors.push(err.message));

      const response = await pw.goto(page.path, { waitUntil: 'domcontentloaded' });

      // Page should not return a server error
      expect(response?.status()).toBeLessThan(500);

      // Page should have content rendered
      const body = pw.locator('body');
      await expect(body).not.toBeEmpty();

      // No uncaught JS errors
      expect(errors).toEqual([]);
    });
  }

  test('health endpoint returns 200', async ({ page }) => {
    const response = await page.goto('/health');
    expect(response?.status()).toBe(200);
  });

  test('404 page renders for unknown route', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345');
    // Either 404 or a catch-all rendering a page is acceptable
    expect(response?.status()).toBeLessThan(500);
  });
});
