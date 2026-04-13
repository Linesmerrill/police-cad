import { test, expect } from '../../fixtures/test-fixtures';
import { LandingPage } from '../../pages/landing.page';

test.describe('Landing Page', () => {
  test('loads and displays hero content', async ({ unauthPage: page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.expectLoaded();
  });

  test('displays navigation links', async ({ unauthPage: page }) => {
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
    // Nav shows "Login" as text link in top-right area
    await expect(page.getByText('Login', { exact: true }).first()).toBeVisible();
  });

  test('displays footer', async ({ unauthPage: page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.expectFooterVisible();
  });
});
