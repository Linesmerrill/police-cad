import { test, expect } from '../fixtures/test-fixtures';
import { MOCK_USER_RESPONSE } from '../fixtures/test-data';

test.describe('Manage Subscription Page', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.blockExternalApis();
  });

  test.describe('page load and layout', () => {
    test('loads successfully with user data', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      const response = await page.goto('/manage-subscription');
      expect(response?.status()).toBeLessThan(500);

      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('displays the Manage Subscription heading', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      await page.goto('/manage-subscription');
      await expect(page.getByText('Manage Subscription')).toBeVisible();
    });

    test('displays subscription details subheading', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      await page.goto('/manage-subscription');
      await expect(page.getByText('View and manage your subscription details')).toBeVisible();
    });

    test('no uncaught JS errors on load', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto('/manage-subscription');
      await page.waitForLoadState('networkidle');

      expect(errors).toEqual([]);
    });
  });

  test.describe('free plan user', () => {
    test('displays Free plan name', async ({ page, mockApi }) => {
      // Default mock user has subscription.plan = 'free' and active = false
      await mockApi.mockUserCurrent();

      await page.goto('/manage-subscription');
      await expect(page.getByText('Free')).toBeVisible();
    });

    test('shows inactive status for free plan', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      await page.goto('/manage-subscription');
      await expect(page.getByText('Inactive')).toBeVisible();
    });

    test('shows upgrade prompt for free plan', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      await page.goto('/manage-subscription');
      await expect(page.getByText(/don.*t have an active subscription/i)).toBeVisible();
    });

    test('has a View Plans link for free users', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      await page.goto('/manage-subscription');
      const viewPlansLink = page.getByText('View Plans');
      await expect(viewPlansLink).toBeVisible();

      // Verify it links to pricing
      const href = await viewPlansLink.getAttribute('href');
      expect(href).toBe('/pricing');
    });
  });

  test.describe('active subscription user', () => {
    const activeSubscriptionOverrides = {
      subscription: {
        plan: 'premium',
        active: true,
        source: 'stripe',
        isAnnual: false,
      },
    };

    test('displays Premium plan name', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent(activeSubscriptionOverrides);

      await page.goto('/manage-subscription');
      await expect(page.getByText('Premium')).toBeVisible();
    });

    test('shows Active status', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent(activeSubscriptionOverrides);

      await page.goto('/manage-subscription');
      await expect(page.getByText('Active')).toBeVisible();
    });

    test('shows billing details for active subscription', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent(activeSubscriptionOverrides);

      await page.goto('/manage-subscription');
      await expect(page.getByText('BILLING')).toBeVisible();
      await expect(page.getByText('Monthly')).toBeVisible();
    });

    test('shows purchase source for active subscription', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent(activeSubscriptionOverrides);

      await page.goto('/manage-subscription');
      await expect(page.getByText('PURCHASED VIA')).toBeVisible();
      await expect(page.getByText('Web (Stripe)')).toBeVisible();
    });
  });

  test.describe('premium plus plan display', () => {
    test('displays Premium Plus plan name', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent({
        subscription: {
          plan: 'premium_plus',
          active: true,
          source: 'stripe',
          isAnnual: true,
        },
      });

      await page.goto('/manage-subscription');
      await expect(page.getByText('Premium Plus')).toBeVisible();
    });

    test('shows Annual billing for annual subscription', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent({
        subscription: {
          plan: 'premium_plus',
          active: true,
          source: 'stripe',
          isAnnual: true,
        },
      });

      await page.goto('/manage-subscription');
      await expect(page.getByText('Annual')).toBeVisible();
    });
  });

  test.describe('authentication redirect', () => {
    test('redirects to login when user is not authenticated', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();

      await page.goto('/manage-subscription');

      // The page should redirect to login with a redirect parameter
      await page.waitForURL('**/login**', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('API interaction', () => {
    test('fetches /api/user/current on page load', async ({ page }) => {
      let apiCalled = false;
      await page.route('**/api/user/current', (route) => {
        apiCalled = true;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_USER_RESPONSE),
        });
      });

      await page.route('**/police-cad-app-api**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        })
      );

      await page.goto('/manage-subscription');
      await page.waitForLoadState('networkidle');

      expect(apiCalled).toBe(true);
    });
  });
});
