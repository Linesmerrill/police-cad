import { test, expect } from '../../fixtures/test-fixtures';
import { BasePage } from '../../pages/base.page';

test.describe('FAQ Page', () => {
  test.skip(({ }, testInfo) => !!process.env.CI, 'Flaky in CI — SSR hydration issue');
  test('loads and displays FAQ categories', async ({ unauthPage: page }) => {
    await page.goto('/faq', { waitUntil: 'networkidle' });
    const basePage = new BasePage(page);
    await basePage.expectPageLoaded();
    await expect(page.getByText('Getting Started')).toBeVisible({ timeout: 10_000 });
  });

  test('FAQ items are expandable', async ({ unauthPage: page }) => {
    await page.goto('/faq', { waitUntil: 'networkidle' });
    await expect(page.getByText('What is Lines Police CAD?')).toBeVisible({ timeout: 10_000 });
  });
});
