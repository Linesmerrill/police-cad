import { test, expect } from '@playwright/test';
import { TEST_FIREARM_SERIAL } from '../../helpers/seed';

test.describe('Firearm Search', { tag: '@auth' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    // Navigate to firearm search tab
    const firearmTab = page.locator('.cd-mdt-search-tab[data-search="firearm"], .cd-mdt-launcher-item:has-text("Firearm")').first();
    await expect(firearmTab).toBeVisible({ timeout: 15_000 });
    await firearmTab.click();
    await expect(page.locator('#cd-fs-input').first()).toBeVisible({ timeout: 5_000 });
  });

  test('finds seeded firearm by serial number', async ({ page }) => {
    await page.locator('#cd-fs-input').first().fill(TEST_FIREARM_SERIAL);
    const results = page.locator('#cd-fs-results');
    await expect(results.getByText(TEST_FIREARM_SERIAL)).toBeVisible({ timeout: 10_000 });
  });

  test('shows firearm details (name, type, caliber)', async ({ page }) => {
    await page.locator('#cd-fs-input').first().fill(TEST_FIREARM_SERIAL);
    const results = page.locator('#cd-fs-results');
    await expect(results.getByText(TEST_FIREARM_SERIAL)).toBeVisible({ timeout: 10_000 });
    await expect(results.getByText(/Glock|Pistol|9mm/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
