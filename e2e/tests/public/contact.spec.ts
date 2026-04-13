import { test, expect } from '@playwright/test';
import { BasePage } from '../../pages/base.page';

test.describe('Contact Us Page', () => {
  test('loads and displays contact information', async ({ page }) => {
    await page.goto('/contact-us');
    const basePage = new BasePage(page);
    await basePage.expectPageLoaded();
  });
});
