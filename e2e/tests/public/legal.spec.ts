import { test, expect } from '@playwright/test';
import { BasePage } from '../../pages/base.page';

test.describe('Legal Pages', () => {
  test('privacy policy page loads', async ({ page }) => {
    await page.goto('/privacy-policy');
    const basePage = new BasePage(page);
    await basePage.expectPageLoaded();
    // Title uses shimmer text pattern (duplicate spans), so check for page-specific content instead
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText('Effective date: December')).toBeVisible();
  });

  test('terms and conditions page loads', async ({ page }) => {
    await page.goto('/terms-and-conditions');
    const basePage = new BasePage(page);
    await basePage.expectPageLoaded();
    await expect(page.getByText(/terms/i).first()).toBeVisible();
  });
});
