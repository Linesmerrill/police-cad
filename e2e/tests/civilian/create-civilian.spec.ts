import { test, expect } from '@playwright/test';
import { CivDashboardPage } from '../../pages/civ-dashboard.page';
import {
  getCivilianByName,
  deleteCiviliansByPrefix,
  uniqueCivName,
} from '../../helpers/db';

test.describe('Create civilian', { tag: '@auth' }, () => {
  const PREFIX = 'p8create';

  test.afterEach(async () => {
    await deleteCiviliansByPrefix(PREFIX);
  });

  test('creates a civilian via the modal and card appears', async ({ page }) => {
    const name = uniqueCivName(PREFIX);
    const dashboard = new CivDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForCivsLoaded();

    await dashboard.openNewCivModal();
    await dashboard.fillNewCivForm({ name, birthday: '1995-06-15' });
    await dashboard.submitNewCiv();

    await dashboard.expectToast(/civilian created/i);

    // Card should appear after reload
    await expect(dashboard.civCard(name)).toBeVisible({ timeout: 10_000 });

    // DB confirmation
    const civ = await getCivilianByName(name);
    expect(civ).toBeTruthy();
  });
});
