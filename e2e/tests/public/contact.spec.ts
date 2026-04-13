import { test, expect } from '../../fixtures/test-fixtures';
import { BasePage } from '../../pages/base.page';

test.describe('Contact Us Page', () => {
  test.fixme(() => !!process.env.CI, 'Next.js SSR pages need production API data — fix by seeding stats/pricing data');
  test('loads and displays contact information', async ({ unauthPage: page }) => {
    await page.goto('/contact-us');
    const basePage = new BasePage(page);
    await basePage.expectPageLoaded();
  });
});
