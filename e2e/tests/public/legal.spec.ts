import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Legal Pages', () => {
  test('privacy policy page loads', async ({ unauthPage: page }) => {
    const response = await page.goto('/privacy-policy', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByText('Effective date').first()).toBeVisible({ timeout: 15_000 });
  });

  test('terms and conditions page loads', async ({ unauthPage: page }) => {
    const response = await page.goto('/terms-and-conditions', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByText(/terms/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
