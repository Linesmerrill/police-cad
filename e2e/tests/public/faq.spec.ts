import { test, expect } from '../../fixtures/test-fixtures';

test.describe('FAQ Page', () => {
  test('loads and displays FAQ categories', async ({ unauthPage: page }) => {
    const response = await page.goto('/faq', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByText('Getting Started')).toBeVisible({ timeout: 15_000 });
  });

  test('FAQ items are expandable', async ({ unauthPage: page }) => {
    const response = await page.goto('/faq', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByText('What is Lines Police CAD?')).toBeVisible({ timeout: 15_000 });
  });
});
