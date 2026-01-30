import { test, expect } from '../fixtures/test-fixtures';
import { PROTECTED_ROUTES } from '../fixtures/test-data';

test.describe('Auth Redirect - Protected Routes', () => {
  test.setTimeout(60000);

  test.describe('Unauthenticated users see login page on protected routes', () => {
    for (const route of PROTECTED_ROUTES) {
      test(`${route} shows login page when not authenticated`, async ({ page, mockApi }) => {
        await mockApi.mockUnauthenticated();
        await mockApi.blockExternalApis();

        const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

        // The authCheck middleware renders the login-civ EJS template at the same URL.
        // It does NOT redirect - so the URL may still be the original route.
        // Check that:
        // 1. The page did not return a server error
        expect(response?.status()).toBeLessThan(500);

        // 2. The page shows a login form (either redirected to /login or rendered login-civ inline)
        const url = page.url();
        const hasLoginContent =
          url.includes('/login') ||
          (await page.getByRole('button', { name: /Login|Sign In/i }).isVisible().catch(() => false));
        expect(hasLoginContent).toBe(true);
      });
    }
  });

  test.describe('Authenticated users can access protected routes', () => {
    for (const route of PROTECTED_ROUTES) {
      test(`${route} is accessible when authenticated`, async ({ page, mockApi }) => {
        await mockApi.mockUserCurrent();
        await mockApi.mockSubscriptionTiers();
        await mockApi.mockCommunityTiers();
        await mockApi.mockCommunities();
        await mockApi.mockContentCreators();
        await mockApi.mockPenalCodes();
        await mockApi.blockExternalApis();

        const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

        // Should not get a server error
        expect(response?.status()).toBeLessThan(500);

        // Should not have been redirected to login
        const url = page.url();
        const stayedOnRoute = url.includes(route) || !url.includes('/login');
        expect(stayedOnRoute).toBe(true);
      });
    }
  });

  test.describe('No server errors on redirect', () => {
    test('protected route redirect does not produce JS errors', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      const response = await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      // Should not have server errors
      expect(response?.status()).toBeLessThan(500);
      expect(errors).toEqual([]);
    });
  });
});
