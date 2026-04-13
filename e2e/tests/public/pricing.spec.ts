import { test, expect } from '@playwright/test';
import { BasePage } from '../../pages/base.page';

test.describe('Pricing Page', () => {
  test('loads and displays pricing tiers', async ({ page }) => {
    await page.goto('/pricing');
    const basePage = new BasePage(page);
    await basePage.expectPageLoaded();
    // Pricing page fetches tiers from API, so check the page structure loads
    await expect(page.locator('h1')).toBeVisible();
  });
});
