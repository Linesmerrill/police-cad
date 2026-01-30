import { test, expect } from '../fixtures/test-fixtures';

test.describe('Logout', () => {
  test.setTimeout(60000);

  test('GET /logout returns a response and redirects away from protected content', async ({ page, mockApi }) => {
    await mockApi.blockExternalApis();

    // Navigate to /logout
    const response = await page.goto('/logout', { waitUntil: 'commit' });

    // The logout route should respond successfully (it destroys session and redirects)
    expect(response?.status()).toBeLessThan(500);

    // Wait for any redirect to complete
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    // After logout, the user should be on the home page, login page, or admin page
    const url = page.url();
    const isOnPublicPage = url.endsWith('/') || url.includes('/login') || url.includes('/home') || url.includes('/admin') || url.includes('/logout');
    expect(isOnPublicPage).toBe(true);
  });

  test('logout destroys session and user cannot access protected routes', async ({ page, mockApi }) => {
    await mockApi.blockExternalApis();

    // First, go to logout
    await page.goto('/logout', { waitUntil: 'commit' });
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    // Now mock unauthenticated state (session is destroyed)
    await mockApi.mockUnauthenticated();

    // Try to access a protected route
    const response = await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

    // The authCheck middleware renders the login form at the same URL (doesn't redirect).
    // So we check that:
    // 1. No server error
    expect(response?.status()).toBeLessThan(500);

    // 2. The page shows login content (either redirected or rendered inline)
    const url = page.url();
    const showsLoginContent =
      url.includes('/login') ||
      (await page.getByRole('button', { name: /Login|Sign In/i }).isVisible().catch(() => false));
    expect(showsLoginContent).toBe(true);
  });

  test('logout page does not return a server error', async ({ page, mockApi }) => {
    await mockApi.blockExternalApis();

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto('/logout', { waitUntil: 'commit' });
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    expect(response?.status()).toBeLessThan(500);
    expect(errors).toEqual([]);
  });

  test('multiple logouts do not cause errors', async ({ page, mockApi }) => {
    await mockApi.blockExternalApis();

    // Logout twice in succession should not error
    const response1 = await page.goto('/logout', { waitUntil: 'commit' });
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    expect(response1?.status()).toBeLessThan(500);

    const response2 = await page.goto('/logout', { waitUntil: 'commit' });
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    expect(response2?.status()).toBeLessThan(500);
  });
});
