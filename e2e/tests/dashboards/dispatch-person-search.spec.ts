import { test, expect } from '@playwright/test';
import {
  addDispatchDepartment,
  removeDepartmentById,
  encodeIdForUrl,
  setBetaCommandDispatch,
  deleteUserPreferences,
} from '../../helpers/db';

test.describe('Dispatch command-dashboard — Person Search', { tag: '@auth' }, () => {
  let deptId: string;

  test.beforeEach(async () => {
    // /command-dashboard is beta-gated — opt the seeded user into the
    // dispatch bridge flag so the gate lets us through.
    await setBetaCommandDispatch(true);
    deptId = await addDispatchDepartment({ nameSearchEnabled: true });
  });

  test.afterEach(async () => {
    await removeDepartmentById(deptId);
    await deleteUserPreferences();
  });

  test('exposes Person Search when template has nameSearch enabled', async ({ page }) => {
    const encoded = encodeIdForUrl(deptId);
    await page.goto(`/command-dashboard?dept=Dispatch&d=${encoded}`);

    // Wait for the dashboard to finish building (loading → panels swap).
    await expect(page.locator('#dd-panels')).toBeVisible({ timeout: 15_000 });

    // Search column visible + Person tab visible + Person pane has content.
    await expect(page.locator('#cd-mdt-col-search')).toBeVisible();
    await expect(
      page.locator('.cd-mdt-search-tab[data-search="person"]')
    ).toBeVisible();
    await expect(page.locator('#cd-mdt-pane-person')).not.toBeEmpty();

    // Sidebar nav entry should also be present.
    await expect(
      page.locator('#dd-nav-components .dd-nav-item[data-panel="personSearch"]')
    ).toHaveCount(1);
  });

  test('hides Person Search when template has nameSearch disabled', async ({ page }) => {
    // Re-seed with nameSearch disabled for this test.
    await removeDepartmentById(deptId);
    deptId = await addDispatchDepartment({ nameSearchEnabled: false });

    const encoded = encodeIdForUrl(deptId);
    await page.goto(`/command-dashboard?dept=Dispatch&d=${encoded}`);

    await expect(page.locator('#dd-panels')).toBeVisible({ timeout: 15_000 });

    // Person tab should be hidden (display:none via .toggle(false)).
    await expect(
      page.locator('.cd-mdt-search-tab[data-search="person"]')
    ).toBeHidden();
    await expect(
      page.locator('#dd-nav-components .dd-nav-item[data-panel="personSearch"]')
    ).toHaveCount(0);
  });
});
