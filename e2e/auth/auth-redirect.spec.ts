import { test, expect } from '../fixtures/test-fixtures';
import { PROTECTED_ROUTES } from '../fixtures/test-data';

test.describe('Auth Redirect - Protected Routes', () => {
  test.describe('Unauthenticated users are redirected to login', () => {
    for (const route of PROTECTED_ROUTES) {
      test(`${route} redirects to login when not authenticated`, async ({ page, mockApi }) => {
        await mockApi.mockUnauthenticated();
        await mockApi.blockExternalApis();

        await page.goto(route, { waitUntil: 'domcontentloaded' });

        // The user should be redirected to a login or home page
        await page.waitForURL(/\/(login|$)/, { timeout: 15000 });

        const url = page.url();
        const wasRedirected = url.includes('/login') || url.endsWith('/');
        expect(wasRedirected).toBe(true);
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

      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      // Wait for potential redirect
      await page.waitForURL(/\/(login|$)/, { timeout: 15000 });

      expect(errors).toEqual([]);
    });
  });
});
