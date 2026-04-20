import { test, expect } from '@playwright/test';
import { CivDashboardPage } from '../../pages/civ-dashboard.page';
import {
  createTestFirearm,
  getFirearmBySerial,
  deleteFirearmById,
  uniqueCivName,
} from '../../helpers/db';

test.describe('Firearm CRUD', { tag: '@auth' }, () => {
  const ids: string[] = [];

  test.afterEach(async () => {
    for (const id of ids) {
      await deleteFirearmById(id).catch(() => {});
    }
    ids.length = 0;
  });

  test('creates a firearm via the modal', async ({ page }) => {
    const serial = `P8FA-${Date.now()}`;
    const name = `P8TestGun${Date.now().toString(36)}`;
    const dashboard = new CivDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForFirearmsLoaded();

    await dashboard.openNewFirearmModal();
    await dashboard.fillNewFirearmForm({ serial, name });
    await dashboard.submitNewFirearm();

    await dashboard.expectToast(/firearm created/i);
    await expect(dashboard.firearmCard(name)).toBeVisible({ timeout: 10_000 });

    const fa = await getFirearmBySerial(serial);
    expect(fa).toBeTruthy();
    if (fa) ids.push(fa._id.toString());
  });

  test('edits a firearm name via details modal', async ({ page }) => {
    const serial = `P8FA-EDIT-${Date.now()}`;
    const oldName = `P8OldGun${Date.now().toString(36)}`;
    const newName = `P8NewGun${Date.now().toString(36)}`;
    const id = await createTestFirearm({ serialNumber: serial, name: oldName });
    ids.push(id);

    const dashboard = new CivDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForFirearmsLoaded();

    await dashboard.openFirearmDetails(oldName);
    await dashboard.editFirearmName(newName);
    await dashboard.saveFirearmEdit();

    await dashboard.expectToast(/firearm updated/i);

    await page.waitForTimeout(1000);
    await dashboard.goto();
    await dashboard.waitForFirearmsLoaded();
    await expect(dashboard.firearmCard(newName)).toBeVisible({ timeout: 10_000 });
  });

  test('deletes a firearm from details modal', async ({ page }) => {
    const serial = `P8FA-DEL-${Date.now()}`;
    const name = `P8DelGun${Date.now().toString(36)}`;
    const id = await createTestFirearm({ serialNumber: serial, name });
    ids.push(id);

    const dashboard = new CivDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForFirearmsLoaded();

    await dashboard.openFirearmDetails(name);
    await dashboard.deleteFirearmFromModal();

    await dashboard.expectToast(/firearm deleted/i);
    await expect(dashboard.firearmCard(name)).not.toBeVisible({ timeout: 10_000 });

    const fa = await getFirearmBySerial(serial);
    expect(fa).toBeNull();
  });
});
