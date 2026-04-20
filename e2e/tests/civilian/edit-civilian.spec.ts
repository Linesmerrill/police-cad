import { test, expect } from '@playwright/test';
import { CivDashboardPage } from '../../pages/civ-dashboard.page';
import {
  createTestCivilian,
  getCivilianByName,
  deleteCiviliansByPrefix,
  uniqueCivName,
} from '../../helpers/db';

test.describe('Edit civilian', { tag: '@auth' }, () => {
  const PREFIX = 'p8edit';

  test.afterEach(async () => {
    await deleteCiviliansByPrefix(PREFIX);
  });

  test('edits civilian name via details modal', async ({ page }) => {
    const originalName = uniqueCivName(PREFIX);
    const updatedName = uniqueCivName(PREFIX);
    await createTestCivilian({ firstName: originalName });

    const dashboard = new CivDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForCivsLoaded();

    await dashboard.openCivDetails(originalName);
    await dashboard.editCivName(updatedName);
    await dashboard.saveCivEdit();

    await dashboard.expectToast(/civilian updated/i);

    // Verify the renamed card appears
    await page.waitForTimeout(1000);
    await dashboard.goto();
    await dashboard.waitForCivsLoaded();
    await expect(dashboard.civCard(updatedName)).toBeVisible({ timeout: 10_000 });

    // DB confirmation
    const civ = await getCivilianByName(updatedName);
    expect(civ).toBeTruthy();
  });
});
