import { test, expect } from '@playwright/test';
import { TEST_VEHICLE_PLATE } from '../../helpers/seed';

test.describe('Plate Search', { tag: '@auth' }, () => {
  test('finds seeded vehicle by plate number', async ({ page }) => {
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    const searchInput = page.locator('#cd-vs-input');
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    await searchInput.fill(TEST_VEHICLE_PLATE);

    const results = page.locator('#cd-vs-results');
    await expect(results.getByText(TEST_VEHICLE_PLATE)).toBeVisible({ timeout: 10_000 });
  });

  test('shows vehicle details (make, model, color)', async ({ page }) => {
    await page.goto('/command-dashboard');
    const searchInput = page.locator('#cd-vs-input');
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    await searchInput.fill(TEST_VEHICLE_PLATE);

    const results = page.locator('#cd-vs-results');
    await expect(results.getByText(TEST_VEHICLE_PLATE)).toBeVisible({ timeout: 10_000 });
    // Check vehicle details are shown
    await expect(results.getByText(/Honda|Civic|Blue/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
