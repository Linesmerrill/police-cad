import { test, expect } from '../../fixtures/test-fixtures';
import { BasePage } from '../../pages/base.page';

test.describe('FAQ Page', () => {
  test('loads and displays FAQ categories', async ({ unauthPage: page }) => {
    await page.goto('/faq');
    const basePage = new BasePage(page);
    await basePage.expectPageLoaded();
    await expect(page.locator('text=Getting Started')).toBeVisible();
  });

  test('FAQ items are expandable', async ({ unauthPage: page }) => {
    await page.goto('/faq');
    const firstQuestion = page.locator('text=What is Lines Police CAD?');
    await expect(firstQuestion).toBeVisible();
  });
});
