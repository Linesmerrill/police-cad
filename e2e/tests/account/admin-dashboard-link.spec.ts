import { test, expect } from '@playwright/test';
import {
  seedLinkedAdminForTestUser,
  seedUnlinkedAdminMatchingTestUserEmail,
  removeSeededAdminUsers,
} from '../../helpers/admin-users';

// The site has two profile dropdowns that should both behave identically:
//   - Next.js Navbar (components/Navbar.tsx) — renders the admin link
//     conditionally based on user.isAdmin in /api/user/current.
//   - Legacy EJS dropdown (views/communities.ejs, views/community-details.ejs)
//     — renders the admin link hidden by default; account-dropdown-admin.js
//     fetches /api/user/current and toggles display when isAdmin is true.
//
// Both dropdowns mark the option with data-testid="navbar-admin-dashboard"
// so we use `toBeVisible()` / `toBeHidden()` (not `toHaveCount`) — that way
// the same assertions work whether the element is conditionally rendered
// out of the DOM or simply CSS-hidden.

async function openProfileDropdown(page) {
  await page.getByRole('button', { name: /testuser/i }).first().click();
}

test.describe('Profile dropdown — Admin Dashboard option', { tag: '@auth' }, () => {
  test('hidden on /communities for non-admin users', async ({ page }) => {
    await page.goto('/communities');
    await openProfileDropdown(page);

    await expect(page.getByRole('link', { name: /Account Settings/i }).first()).toBeVisible();
    await expect(page.getByTestId('navbar-admin-dashboard')).toBeHidden();
  });

  test('visible on /communities for admin users and links to /admin', async ({ page }) => {
    // Override /api/user/current with isAdmin:true so the legacy dropdown's
    // reveal script (and the Next.js Navbar's conditional) treat us as admin.
    await page.route('**/api/user/current', async (route) => {
      const original = await route.fetch();
      const body = await original.json();
      if (body && body.user) body.user.isAdmin = true;
      await route.fulfill({ json: body });
    });

    await page.goto('/communities');
    await openProfileDropdown(page);

    const adminLink = page.getByTestId('navbar-admin-dashboard').first();
    await expect(adminLink).toBeVisible();
    await expect(adminLink).toContainText(/Admin Dashboard/i);
    await expect(adminLink).toHaveAttribute('href', '/admin');

    await adminLink.click();
    await expect(page).toHaveURL(/\/admin(\?|$)/, { timeout: 10_000 });
  });
});

// These tests skip the page.route mock and instead seed real admin_users
// rows so we exercise the actual resolution logic in /api/user/current
// (linkedUserId match, then unlinked email match). Each test cleans up
// after itself so the default seeded testuser remains a non-admin for
// the rest of the suite.
test.describe('Profile dropdown — Admin Dashboard option (real backend lookup)', { tag: '@auth' }, () => {
  test.afterEach(async () => {
    await removeSeededAdminUsers();
  });

  test('shows for an admin linked to the test user via linkedUserId', async ({ page }) => {
    await seedLinkedAdminForTestUser();

    await page.goto('/communities');
    await page.getByRole('button', { name: /testuser/i }).first().click();

    const adminLink = page.getByTestId('navbar-admin-dashboard').first();
    await expect(adminLink).toBeVisible({ timeout: 10_000 });
    await expect(adminLink).toHaveAttribute('href', '/admin');
  });

  test('shows for an unlinked admin whose email matches the user', async ({ page }) => {
    await seedUnlinkedAdminMatchingTestUserEmail();

    await page.goto('/communities');
    await page.getByRole('button', { name: /testuser/i }).first().click();

    await expect(
      page.getByTestId('navbar-admin-dashboard').first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
