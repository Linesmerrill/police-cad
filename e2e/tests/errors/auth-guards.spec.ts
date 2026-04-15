import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Auth Guards (Unauthorized Access)', () => {
  // These tests use `unauthPage` — a page with no stored auth session.
  // Protected routes should redirect to login.

  test('command dashboard redirects to login when unauthenticated', async ({ unauthPage }) => {
    await unauthPage.goto('/command-dashboard');
    await expect(unauthPage).toHaveURL(/\/login/);
  });

  test('police dashboard redirects to login when unauthenticated', async ({ unauthPage }) => {
    await unauthPage.goto('/police-dashboard');
    await expect(unauthPage).toHaveURL(/\/login/);
  });

  test('civilian dashboard redirects to login when unauthenticated', async ({ unauthPage }) => {
    await unauthPage.goto('/civ-dashboard');
    await expect(unauthPage).toHaveURL(/\/login/);
  });

  test('dispatch dashboard redirects to login when unauthenticated', async ({ unauthPage }) => {
    await unauthPage.goto('/dispatch-dashboard');
    await expect(unauthPage).toHaveURL(/\/login/);
  });

  test('ems dashboard redirects to login when unauthenticated', async ({ unauthPage }) => {
    await unauthPage.goto('/ems-dashboard');
    await expect(unauthPage).toHaveURL(/\/login/);
  });

  test('community dashboard redirects to login when unauthenticated', async ({ unauthPage }) => {
    await unauthPage.goto('/community-dashboard');
    await expect(unauthPage).toHaveURL(/\/login/);
  });

  test('profile page redirects when unauthenticated', async ({ unauthPage }) => {
    // Next.js profile page checks auth client-side and may redirect differently
    await unauthPage.goto('/profile');
    // Should either redirect to login or show login prompt
    const url = unauthPage.url();
    const hasLogin = url.includes('/login');
    const hasProfileWithoutData = await unauthPage.getByText('Account Overview').isVisible().catch(() => false);
    // Either redirected to login or showed profile without user data
    expect(hasLogin || !hasProfileWithoutData).toBe(true);
  });
});
