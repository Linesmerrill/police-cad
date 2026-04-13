import { test, expect } from '../../fixtures/test-fixtures';
import { BasePage } from '../../pages/base.page';

test.describe('Penal Code Page', () => {
  test.skip(() => !!process.env.CI, 'Next.js SSR pages need production API data');
  test('loads and displays penal code content', async ({ unauthPage: page }) => {
    await page.goto('/penal-code');
    const basePage = new BasePage(page);
    await basePage.expectPageLoaded();
  });
});
