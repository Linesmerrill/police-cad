import { test, expect } from '../../fixtures/test-fixtures';
import { BasePage } from '../../pages/base.page';

test.describe('About Us Page', () => {
  test.skip(() => !!process.env.CI, 'Next.js SSR pages need production API data');
  test('loads and displays content', async ({ unauthPage: page }) => {
    await page.goto('/about-us');
    const basePage = new BasePage(page);
    await basePage.expectPageLoaded();
    await expect(page.locator('h1')).toBeVisible();
    // Card titles use styled heading elements
    await expect(page.getByText("world's leading free to use")).toBeVisible();
  });
});
