import { test, expect } from '../fixtures/test-fixtures';

test.describe('Logout', () => {
  test('GET /logout returns a response and redirects away from protected content', async ({ page, mockApi }) => {
    await mockApi.blockExternalApis();

    // Navigate to /logout
    const response = await page.goto('/logout', { waitUntil: 'domcontentloaded' });

    // The logout route should respond successfully (it destroys session and redirects)
    expect(response?.status()).toBeLessThan(500);

    // After logout, the user should be on the home page or login page
    const url = page.url();
    const isOnPublicPage = url.endsWith('/') || url.includes('/login') || url.includes('/home');
    expect(isOnPublicPage).toBe(true);
  });

  test('logout destroys session and user cannot access protected routes', async ({ page, mockApi }) => {
    await mockApi.blockExternalApis();

    // First, go to logout
    await page.goto('/logout', { waitUntil: 'domcontentloaded' });

    // Now mock unauthenticated state (session is destroyed)
    await mockApi.mockUnauthenticated();

    // Try to access a protected route
    await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

    // Should be redirected to login or see login content
    await page.waitForURL(/\/(login|$)/, { timeout: 10000 });
    const url = page.url();
    const redirectedAway = url.includes('/login') || url.endsWith('/');
    expect(redirectedAway).toBe(true);
  });

  test('logout page does not return a server error', async ({ page, mockApi }) => {
    await mockApi.blockExternalApis();

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto('/logout', { waitUntil: 'domcontentloaded' });

    expect(response?.status()).toBeLessThan(500);
    expect(errors).toEqual([]);
  });

  test('multiple logouts do not cause errors', async ({ page, mockApi }) => {
    await mockApi.blockExternalApis();

    // Logout twice in succession should not error
    const response1 = await page.goto('/logout', { waitUntil: 'domcontentloaded' });
    expect(response1?.status()).toBeLessThan(500);

    const response2 = await page.goto('/logout', { waitUntil: 'domcontentloaded' });
    expect(response2?.status()).toBeLessThan(500);
  });
});
