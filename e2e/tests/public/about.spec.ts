import { test, expect } from '../../fixtures/test-fixtures';

test.describe('About Us Page', () => {
  test('loads and displays content', async ({ unauthPage: page }) => {
    const response = await page.goto('/about-us', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByText('Free to Use').first()).toBeVisible({ timeout: 15_000 });
  });
});
