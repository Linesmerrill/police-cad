import { test, expect } from '../fixtures/test-fixtures';

test.describe('Content Creators Page', () => {
  test.describe('with creators loaded', () => {
    test.beforeEach(async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.mockContentCreators();
      await mockApi.blockExternalApis();

      // Also mock the stats endpoint
      await page.route('**/api/v1/content-creators/stats', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            activeCount: 5,
            combinedReach: 25000,
          }),
        })
      );

      await page.goto('/content-creators', { waitUntil: 'domcontentloaded' });
    });

    test('renders the page without errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await expect(page.locator('body')).not.toBeEmpty();
      expect(errors).toEqual([]);
    });

    test('displays the main hero headline', async ({ page }) => {
      await expect(page.getByText('Create. Stream.')).toBeVisible();
      await expect(page.getByText('Get Rewarded.')).toBeVisible();
    });

    test('displays the Content Creator Program badge', async ({ page }) => {
      await expect(
        page.getByText('Content Creator Program')
      ).toBeVisible();
    });

    test('displays the hero description', async ({ page }) => {
      await expect(
        page.getByText('Join the Lines Police CAD Creator Program')
      ).toBeVisible();
    });

    test('displays the navbar and footer', async ({ page }) => {
      await expect(page.locator('nav').first()).toBeVisible();
      await expect(page.locator('footer').first()).toBeVisible();
    });

    test('displays Apply Now CTA link', async ({ page }) => {
      const applyLink = page.locator('a[href="/content-creators/apply"]').first();
      await expect(applyLink).toBeVisible();
    });

    test('displays View Creators link', async ({ page }) => {
      const viewLink = page.locator('a[href="#creators"]');
      await expect(viewLink).toBeVisible();
      await expect(viewLink).toContainText('View Creators');
    });

    test('displays stats section', async ({ page }) => {
      await expect(page.getByText('Active Creators')).toBeVisible();
      await expect(page.getByText('Combined Reach')).toBeVisible();
      await expect(page.getByText('Yearly Value')).toBeVisible();
    });

    test('displays Program Requirements section', async ({ page }) => {
      await expect(page.getByText('Program Requirements')).toBeVisible();
      await expect(page.getByText('500+ Followers')).toBeVisible();
      await expect(page.getByText('Active LPC Content')).toBeVisible();
      await expect(page.getByText('Quality Content')).toBeVisible();
    });

    test('displays What You Get benefits section', async ({ page }) => {
      await expect(page.getByText('What You Get')).toBeVisible();
      await expect(page.getByText('Free Base Plan')).toBeVisible();
    });

    test('displays the benefits list', async ({ page }) => {
      await expect(page.getByText('Base Plan for your personal account')).toBeVisible();
      await expect(page.getByText('Featured profile on our creators directory')).toBeVisible();
    });

    test('displays the total value', async ({ page }) => {
      await expect(page.getByText('$72')).toBeVisible();
      await expect(page.getByText('/year')).toBeVisible();
    });

    test('displays Our Creators section', async ({ page }) => {
      await expect(page.getByText('Our Creators')).toBeVisible();
    });

    test('displays Ready to Join section', async ({ page }) => {
      await expect(page.getByText('Ready to Join?')).toBeVisible();
    });

    test('has Start Your Application link', async ({ page }) => {
      const startLink = page.locator('a[href="/content-creators/apply"]').filter({
        hasText: 'Start Your Application',
      });
      await expect(startLink).toBeVisible();
    });
  });

  test.describe('with empty creators list', () => {
    test.beforeEach(async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      // Mock empty creators response
      await page.route('**/api/v1/content-creators**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, creators: [] }),
        })
      );

      await page.route('**/api/v1/content-creators/stats', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            activeCount: 0,
            combinedReach: 0,
          }),
        })
      );

      await page.goto('/content-creators', { waitUntil: 'domcontentloaded' });
    });

    test('shows empty state when no creators exist', async ({ page }) => {
      await expect(page.getByText('Be a Pioneer!')).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText('Our Creator Program is brand new')
      ).toBeVisible();
    });
  });
});
