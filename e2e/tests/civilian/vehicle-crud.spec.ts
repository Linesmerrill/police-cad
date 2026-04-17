import { test, expect } from '@playwright/test';
import { CivDashboardPage } from '../../pages/civ-dashboard.page';
import {
  createTestVehicle,
  getVehicleByPlate,
  deleteVehiclesByPrefix,
  uniqueCivName,
} from '../../helpers/db';

test.describe('Vehicle CRUD', { tag: '@auth' }, () => {
  const PREFIX = 'P8V';

  test.afterEach(async () => {
    await deleteVehiclesByPrefix(PREFIX);
  });

  test('creates a vehicle via the modal', async ({ page }) => {
    const plate = `${PREFIX}${Date.now().toString(36)}`.toUpperCase();
    const vin = `VIN${Date.now()}`;
    const dashboard = new CivDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForVehiclesLoaded();

    await dashboard.openNewVehicleModal();
    await dashboard.fillNewVehicleForm({ plate, vin });
    await dashboard.submitNewVehicle();

    await dashboard.expectToast(/vehicle created/i);
    await expect(dashboard.vehCard(plate)).toBeVisible({ timeout: 10_000 });

    const veh = await getVehicleByPlate(plate);
    expect(veh).toBeTruthy();
  });

  test('edits a vehicle plate via details modal', async ({ page }) => {
    const oldPlate = `${PREFIX}OLD${Date.now().toString(36)}`.toUpperCase();
    const newPlate = `${PREFIX}NEW${Date.now().toString(36)}`.toUpperCase();
    await createTestVehicle({ plate: oldPlate });

    const dashboard = new CivDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForVehiclesLoaded();

    await dashboard.openVehDetails(oldPlate);
    await dashboard.editVehPlate(newPlate);
    await dashboard.saveVehEdit();

    await dashboard.expectToast(/vehicle updated/i);

    await page.waitForTimeout(1000);
    await dashboard.goto();
    await dashboard.waitForVehiclesLoaded();
    await expect(dashboard.vehCard(newPlate)).toBeVisible({ timeout: 10_000 });

    const veh = await getVehicleByPlate(newPlate);
    expect(veh).toBeTruthy();

    // cleanup new plate too
    await deleteVehiclesByPrefix(newPlate.slice(0, 3));
  });

  test('deletes a vehicle from details modal', async ({ page }) => {
    const plate = `${PREFIX}DEL${Date.now().toString(36)}`.toUpperCase();
    await createTestVehicle({ plate });

    const dashboard = new CivDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForVehiclesLoaded();

    await dashboard.openVehDetails(plate);
    await dashboard.deleteVehFromModal();

    await dashboard.expectToast(/vehicle deleted/i);
    await expect(dashboard.vehCard(plate)).not.toBeVisible({ timeout: 10_000 });

    const veh = await getVehicleByPlate(plate);
    expect(veh).toBeNull();
  });
});
