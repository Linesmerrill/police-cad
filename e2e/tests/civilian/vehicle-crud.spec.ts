import { test, expect } from '@playwright/test';
import { CivDashboardPage } from '../../pages/civ-dashboard.page';
import {
  createTestVehicle,
  getVehicleByPlate,
  deleteVehiclesByPrefix,
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

    // Intercept the vehicle create API call to debug
    const apiResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/vehicle') && resp.request().method() === 'POST',
      { timeout: 20_000 }
    );

    await dashboard.goto();
    await dashboard.waitForVehiclesLoaded();

    await dashboard.openNewVehicleModal();
    await dashboard.fillNewVehicleForm({ plate, vin });
    await dashboard.submitNewVehicle();

    const apiResponse = await apiResponsePromise;
    expect(apiResponse.status()).toBeLessThan(400);

    // Reload to see the new vehicle
    await dashboard.goto();
    await dashboard.waitForVehiclesLoaded();
    await expect(dashboard.vehCard(plate)).toBeVisible({ timeout: 15_000 });
  });

  test('edits a vehicle plate via details modal', async ({ page }) => {
    const oldPlate = `${PREFIX}OLD${Date.now().toString(36)}`.toUpperCase();
    const newPlate = `${PREFIX}NEW${Date.now().toString(36)}`.toUpperCase();
    await createTestVehicle({ plate: oldPlate });

    const dashboard = new CivDashboardPage(page);

    const apiResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/vehicle') && resp.request().method() === 'PUT',
      { timeout: 20_000 }
    );

    await dashboard.goto();
    await dashboard.waitForVehiclesLoaded();

    await dashboard.openVehDetails(oldPlate);
    await dashboard.editVehPlate(newPlate);
    await dashboard.saveVehEdit();

    const apiResponse = await apiResponsePromise;
    expect(apiResponse.status()).toBeLessThan(400);

    await dashboard.goto();
    await dashboard.waitForVehiclesLoaded();
    await expect(dashboard.vehCard(newPlate)).toBeVisible({ timeout: 15_000 });

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

    await expect
      .poll(async () => {
        const v = await getVehicleByPlate(plate);
        return v === null;
      }, { timeout: 15_000, intervals: [500, 1000, 2000] })
      .toBe(true);
  });
});
