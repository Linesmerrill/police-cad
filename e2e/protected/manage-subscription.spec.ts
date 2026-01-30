import { test, expect } from '../fixtures/test-fixtures';
import { MOCK_USER_RESPONSE } from '../fixtures/test-data';

test.describe('Manage Subscription Page', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ mockApi }) => {
    await mockApi.blockExternalApis();
  });

  /** Navigate and wait for the page content to load past the "Loading..." state */
  async function gotoManageSubscription(page: any) {
    await page.goto('/manage-subscription', { waitUntil: 'domcontentloaded' });
    // Wait for the heading to appear (indicates loading finished)
    await expect(page.getByText('Manage Subscription').first()).toBeVisible({ timeout: 30000 });
  }

  test.describe('page load and layout', () => {
    test('loads successfully with user data', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      const response = await page.goto('/manage-subscription', { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('displays the Manage Subscription heading', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();
      await gotoManageSubscription(page);
      await expect(page.getByText('Manage Subscription')).toBeVisible();
    });

    test('displays subscription details subheading', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();
      await gotoManageSubscription(page);
      await expect(page.getByText('View and manage your subscription details')).toBeVisible();
    });

    test('no uncaught JS errors on load', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      const errors: string[] = [];
      page.on('pageerror', (err: Error) => errors.push(err.message));

      await page.goto('/manage-subscription', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Manage Subscription').first()).toBeVisible({ timeout: 30000 });

      expect(errors).toEqual([]);
    });
  });

  test.describe('free plan user', () => {
    test('displays Free plan name', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();
      await gotoManageSubscription(page);
      await expect(page.getByText('Free').first()).toBeVisible();
    });

    test('shows inactive status for free plan', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();
      await gotoManageSubscription(page);
      await expect(page.getByText('Inactive')).toBeVisible();
    });

    test('shows upgrade prompt for free plan', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();
      await gotoManageSubscription(page);
      await expect(page.getByText(/don.*t have an active subscription/i)).toBeVisible();
    });

    test('has a View Plans link for free users', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();
      await gotoManageSubscription(page);
      const viewPlansLink = page.getByText('View Plans').first();
      await expect(viewPlansLink).toBeVisible();
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
      await gotoManageSubscription(page);
      await expect(page.getByText('Premium').first()).toBeVisible();
    });

    test('shows Active status', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent(activeSubscriptionOverrides);
      await gotoManageSubscription(page);
      await expect(page.getByText('Active').first()).toBeVisible();
    });

    test('shows billing details for active subscription', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent(activeSubscriptionOverrides);
      await gotoManageSubscription(page);
      await expect(page.getByText('BILLING')).toBeVisible();
      await expect(page.getByText('Monthly')).toBeVisible();
    });

    test('shows purchase source for active subscription', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent(activeSubscriptionOverrides);
      await gotoManageSubscription(page);
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
      await gotoManageSubscription(page);
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
      await gotoManageSubscription(page);
      await expect(page.getByText('Annual')).toBeVisible();
    });
  });

  test.describe('authentication redirect', () => {
    test('shows default free plan when user is not authenticated', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();

      await page.goto('/manage-subscription', { waitUntil: 'domcontentloaded' });

      // When not authenticated, the page renders with default (free) plan state
      // The page also attempts a client-side redirect to /login, but may render first
      await expect(page.getByText('Free').first()).toBeVisible({ timeout: 30000 });
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

      await page.goto('/manage-subscription', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Manage Subscription').first()).toBeVisible({ timeout: 30000 });

      expect(apiCalled).toBe(true);
    });
  });
});
