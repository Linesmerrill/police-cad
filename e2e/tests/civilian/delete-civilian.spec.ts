import { test, expect } from '@playwright/test';
import { CivDashboardPage } from '../../pages/civ-dashboard.page';
import {
  createTestCivilian,
  getCivilianByName,
  deleteCiviliansByPrefix,
  uniqueCivName,
} from '../../helpers/db';

test.describe('Delete civilian', { tag: '@auth' }, () => {
  const PREFIX = 'p8del';

  test.afterEach(async () => {
    await deleteCiviliansByPrefix(PREFIX);
  });

  test('deletes civilian from details modal', async ({ page }) => {
    const name = uniqueCivName(PREFIX);
    await createTestCivilian({ firstName: name });

    const dashboard = new CivDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForCivsLoaded();

    await dashboard.openCivDetails(name);
    await dashboard.deleteCivFromModal();

    await dashboard.expectToast(/civilian deleted/i);

    // Card should vanish
    await expect(dashboard.civCard(name)).not.toBeVisible({ timeout: 10_000 });

    // DB confirmation
    const civ = await getCivilianByName(name);
    expect(civ).toBeNull();
  });
});
