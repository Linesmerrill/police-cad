import { test, expect, Page } from '@playwright/test';
import { TEST_COMMUNITY_ID, TEST_USER_ID } from '../../helpers/seed';
import { communityDetailsUrl } from '../../helpers/test-urls';

/**
 * The API refuses a role change that would leave the community owner without
 * admin (409, "The community owner must keep Head Admin..."). The permissions
 * editor toggles the role's permissions in place before saving, so a refused
 * save must put them back instead of showing a state the server never stored.
 *
 * The roles list and the save are stubbed so the test does not depend on the
 * shared community's roles: the owner holds admin through an "Admins" role,
 * which is the case the guard protects that the UI does not already lock.
 */
const COMMUNITY_HEX = TEST_COMMUNITY_ID.toHexString();
const ROLE_ID = 'aaaaaaaaaaaaaaaaaaaaaaa1';
const ADMIN_PERM_ID = 'bbbbbbbbbbbbbbbbbbbbbbb1';
const REFUSAL = 'The community owner must keep Head Admin. Transfer ownership to someone else first.';

const ROLES_GET = new RegExp(`/api/v1/community/${COMMUNITY_HEX}/roles(\\?.*)?$`);
const PERMISSIONS_PUT = new RegExp(`/api/v1/community/${COMMUNITY_HEX}/roles/${ROLE_ID}/permissions`);

type RolesPage = {
  openRolesModal: () => void;
  openRoleDetails: (id: string) => void;
  openRolePermissionsModal: () => void;
  togglePermission: (id: string, enabled: boolean) => void;
};

async function stubRoles(page: Page) {
  await page.route(ROLES_GET, (route) =>
    route.fulfill({
      json: [
        {
          _id: ROLE_ID,
          name: 'Admins',
          members: [TEST_USER_ID.toHexString()],
          permissions: [
            { _id: ADMIN_PERM_ID, name: 'administrator', description: 'Full access', enabled: true },
            { _id: 'bbbbbbbbbbbbbbbbbbbbbbb2', name: 'manage members', description: 'Allows managing members', enabled: false },
          ],
        },
      ],
    })
  );
}

test.describe('Roles editor: refused permission change', { tag: '@auth' }, () => {
  test('shows the API reason and restores the permissions', async ({ page }) => {
    await stubRoles(page);
    let putBody: unknown = null;
    await page.route(PERMISSIONS_PUT, async (route) => {
      putBody = route.request().postDataJSON();
      await route.fulfill({
        status: 409,
        json: { error: 'owner_must_keep_admin', message: REFUSAL, response: { error: 'owner_must_keep_admin', message: REFUSAL } },
      });
    });

    await page.goto(communityDetailsUrl());
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#community-overview')).toBeVisible({ timeout: 15_000 });

    const rolesLoaded = page.waitForResponse((res) => ROLES_GET.test(res.url()));
    await page.evaluate(() => (window as unknown as RolesPage).openRolesModal());
    await rolesLoaded;
    await expect(page.locator('#rolesCount')).toHaveText('1');

    await page.evaluate(
      ({ roleId, permId }) => {
        const w = window as unknown as RolesPage;
        w.openRoleDetails(roleId);
        w.openRolePermissionsModal();
        w.togglePermission(permId, false);
      },
      { roleId: ROLE_ID, permId: ADMIN_PERM_ID }
    );

    const list = page.locator('#permissionsList');
    const adminToggle = list.locator(`input[onchange*="${ADMIN_PERM_ID}"]`);
    await expect(adminToggle).not.toBeChecked();

    const refused = page.waitForResponse((res) => PERMISSIONS_PUT.test(res.url()));
    await page.locator('#savePermissionsBtn').click();
    await refused;

    // The request really asked to turn administrator off...
    const sent = (putBody as { permissions: { _id: string; enabled: boolean }[] }).permissions;
    expect(sent.find((p) => p._id === ADMIN_PERM_ID)?.enabled).toBe(false);

    // ...the user sees why it was refused, and the editor shows what is saved.
    await expect(page.locator('#toast')).toContainText(REFUSAL);
    await expect(adminToggle).toBeChecked();
    await expect(page.locator('#rolePermissionsModal')).toBeVisible();
  });
});
