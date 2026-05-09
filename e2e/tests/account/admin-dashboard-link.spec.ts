import { test, expect } from '@playwright/test';

// The Navbar's user dropdown shows an "Admin Dashboard" option only when
// `/api/user/current` reports the logged-in user as an admin (resolved via
// the admin_users collection in routes.js). The seeded test user is not
// an admin, so we mock the API for the positive case and exercise the
// real response for the negative case.

test.describe('Profile dropdown — Admin Dashboard option', { tag: '@auth' }, () => {
  test('hidden for non-admin users', async ({ page }) => {
    await page.goto('/communities');

    // Open the user dropdown via the username button (works on desktop &
    // small-screen layouts because both render the same nav node).
    await page.getByRole('button', { name: /testuser/i }).first().click();

    // Account Settings + Logout always show; Admin Dashboard must not.
    await expect(page.getByRole('link', { name: /Account Settings/i })).toBeVisible();
    await expect(
      page.getByTestId('navbar-admin-dashboard')
    ).toHaveCount(0);
  });

  test('visible for admin users and links to /admin', async ({ page }) => {
    // Override /api/user/current with isAdmin:true so the conditional branch
    // renders without needing a seeded admin_users row.
    await page.route('**/api/user/current', async (route) => {
      const original = await route.fetch();
      const body = await original.json();
      if (body && body.user) body.user.isAdmin = true;
      await route.fulfill({ json: body });
    });

    await page.goto('/communities');
    await page.getByRole('button', { name: /testuser/i }).first().click();

    const adminLink = page.getByTestId('navbar-admin-dashboard');
    await expect(adminLink).toBeVisible();
    await expect(adminLink).toContainText(/Admin Dashboard/i);
    await expect(adminLink).toHaveAttribute('href', '/admin');

    await adminLink.click();
    await expect(page).toHaveURL(/\/admin(\?|$)/, { timeout: 10_000 });
  });
});
