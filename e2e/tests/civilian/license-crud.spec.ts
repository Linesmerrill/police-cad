import { test, expect } from '@playwright/test';
import { CivDashboardPage } from '../../pages/civ-dashboard.page';
import {
  createTestCivilian,
  deleteCivilianById,
  deleteLicenseById,
  getLicenseByType,
  uniqueCivName,
} from '../../helpers/db';

/**
 * Licenses are managed inside the civilian details modal → "Licenses" tab.
 * Flow: open civ card → Licenses tab → Add License → fill form → Create.
 */
test.describe('License CRUD', { tag: '@auth' }, () => {
  const PREFIX = 'p8lic';
  let civId: string;
  const licenseIds: string[] = [];

  test.beforeEach(async () => {
    const name = uniqueCivName(PREFIX);
    civId = await createTestCivilian({ firstName: name });
  });

  test.afterEach(async () => {
    for (const id of licenseIds) {
      await deleteLicenseById(id).catch(() => {});
    }
    licenseIds.length = 0;
    await deleteCivilianById(civId).catch(() => {});
  });

  test('creates a license via the civilian details modal', async ({ page }) => {
    const licenseType = `P8Lic-${Date.now().toString(36)}`;
    const dashboard = new CivDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForCivsLoaded();

    // Open the seeded civilian's details modal
    const civName = (await page.locator('#personas-thumbnail .civ-card').first().textContent()) ?? '';
    await page.locator('#personas-thumbnail .civ-card').first().click();
    await expect(page.locator('#civDetailsModal')).toBeVisible({ timeout: 5_000 });

    // Switch to Licenses tab
    await page.locator('#civDetailsModal .heroui-tab[data-tab="licenses"]').click();
    await page.waitForTimeout(500);

    // Click "Add License"
    await dashboard.openNewLicenseModal();
    await dashboard.fillNewLicenseForm({
      type: licenseType,
      status: 'Valid',
      expiry: '2030-12-31',
    });
    await dashboard.submitNewLicense();

    await dashboard.expectToast(/license created/i);

    const lic = await getLicenseByType(licenseType);
    expect(lic).toBeTruthy();
    if (lic) licenseIds.push(lic._id.toString());
  });
});
