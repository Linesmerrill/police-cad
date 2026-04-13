import { test, expect } from '@playwright/test';
import { TEST_FIREARM_SERIAL } from '../../helpers/seed';

test.describe('Firearm Search', { tag: '@auth' }, () => {
  test('finds seeded firearm by serial number', async ({ page }) => {
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    const searchInput = page.locator('#cd-fs-input').first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    await searchInput.fill(TEST_FIREARM_SERIAL);

    const results = page.locator('#cd-fs-results');
    await expect(results.getByText(TEST_FIREARM_SERIAL)).toBeVisible({ timeout: 10_000 });
  });

  test('shows firearm details (name, type, caliber)', async ({ page }) => {
    await page.goto('/command-dashboard');
    const searchInput = page.locator('#cd-fs-input').first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    await searchInput.fill(TEST_FIREARM_SERIAL);

    const results = page.locator('#cd-fs-results');
    await expect(results.getByText(TEST_FIREARM_SERIAL)).toBeVisible({ timeout: 10_000 });
    await expect(results.getByText(/Glock|Pistol|9mm/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
