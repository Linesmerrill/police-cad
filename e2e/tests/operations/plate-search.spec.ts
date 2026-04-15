import { test, expect } from '@playwright/test';
import { TEST_VEHICLE_PLATE } from '../../helpers/seed';

test.describe('Plate Search', { tag: '@auth' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    // Navigate to vehicle search tab
    const vehicleTab = page.locator('.cd-mdt-search-tab[data-search="vehicle"], .cd-mdt-launcher-item:has-text("Vehicle")').first();
    await expect(vehicleTab).toBeVisible({ timeout: 15_000 });
    await vehicleTab.click();
    await expect(page.locator('#cd-vs-input').first()).toBeVisible({ timeout: 5_000 });
  });

  test('finds seeded vehicle by plate number', async ({ page }) => {
    await page.locator('#cd-vs-input').first().fill(TEST_VEHICLE_PLATE);
    const results = page.locator('#cd-vs-results');
    await expect(results.getByText(TEST_VEHICLE_PLATE)).toBeVisible({ timeout: 10_000 });
  });

  test('shows vehicle details (make, model, color)', async ({ page }) => {
    await page.locator('#cd-vs-input').first().fill(TEST_VEHICLE_PLATE);
    const results = page.locator('#cd-vs-results');
    await expect(results.getByText(TEST_VEHICLE_PLATE)).toBeVisible({ timeout: 10_000 });
    await expect(results.getByText(/Honda|Civic|Blue/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
