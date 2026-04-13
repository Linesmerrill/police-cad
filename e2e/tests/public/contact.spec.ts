import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Contact Us Page', () => {
  test('loads and displays contact information', async ({ unauthPage: page }) => {
    const response = await page.goto('/contact-us', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByText('Discord')).toBeVisible({ timeout: 15_000 });
  });
});
