import { test, expect } from '@playwright/test';
import { BasePage } from '../../pages/base.page';

test.describe('Penal Code Page', () => {
  test('loads and displays penal code content', async ({ page }) => {
    await page.goto('/penal-code');
    const basePage = new BasePage(page);
    await basePage.expectPageLoaded();
  });
});
