import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Pricing Page', () => {
  test('loads and displays pricing tiers', async ({ unauthPage: page }) => {
    const response = await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByText(/pricing/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
