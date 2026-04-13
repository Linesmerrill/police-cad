import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Penal Code Page', () => {
  test('loads and displays penal code content', async ({ unauthPage: page }) => {
    const response = await page.goto('/penal-code', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByText(/penal code/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
