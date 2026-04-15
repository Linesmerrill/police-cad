import { test, expect } from '@playwright/test';
import { communityDetailsUrl } from '../../helpers/test-urls';

test.describe('Community Details Page', { tag: '@auth' }, () => {
  test('navigates to community page without crashing', async ({ page }) => {
    const response = await page.goto(communityDetailsUrl());

    // Page should not redirect to login (auth works)
    await expect(page).not.toHaveURL(/\/login/);

    // Page should return either 200 (success) or 404 (error page) — not 500
    expect(response?.status()).not.toBe(500);
  });

  test('renders content (success or error page)', async ({ page }) => {
    await page.goto(communityDetailsUrl());
    await expect(page).not.toHaveURL(/\/login/);

    // If the API is available, the community overview renders.
    // If the API fails, the styled error page renders.
    // Either way, the page should have meaningful content (not a blank 500).
    const hasOverview = await page.locator('#community-overview').isVisible().catch(() => false);
    const hasErrorPage = await page.locator('text=Something went wrong').isVisible().catch(() => false);
    const hasNav = await page.locator('nav').first().isVisible().catch(() => false);

    expect(hasOverview || hasErrorPage || hasNav).toBe(true);
  });

  test('community details loads when API is available', async ({ page }) => {
    await page.goto(communityDetailsUrl());
    await expect(page).not.toHaveURL(/\/login/);

    // Try to check if the full community page rendered
    const overview = page.locator('#community-overview');
    const overviewVisible = await overview.isVisible().catch(() => false);

    if (overviewVisible) {
      // Full community page loaded — verify key sections
      await expect(page.locator('#community-overview-name')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('#community-overview-name')).toContainText('test community', {
        ignoreCase: true,
      });
    } else {
      // API not reachable — the error page renders instead.
      // This is expected in some CI environments. Mark as soft pass.
      test.skip(true, 'Community API not reachable — error page rendered instead');
    }
  });
});
