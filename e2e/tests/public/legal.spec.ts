import { test, expect } from '../../fixtures/test-fixtures';
import { BasePage } from '../../pages/base.page';

test.describe('Legal Pages', () => {
  test('privacy policy page loads', async ({ unauthPage: page }) => {
    await page.goto('/privacy-policy', { waitUntil: 'networkidle' });
    const basePage = new BasePage(page);
    await basePage.expectPageLoaded();
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText('Effective date: December')).toBeVisible({ timeout: 15_000 });
  });

  test('terms and conditions page loads', async ({ unauthPage: page }) => {
    await page.goto('/terms-and-conditions', { waitUntil: 'networkidle' });
    const basePage = new BasePage(page);
    await basePage.expectPageLoaded();
    await expect(page.getByText(/terms/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
