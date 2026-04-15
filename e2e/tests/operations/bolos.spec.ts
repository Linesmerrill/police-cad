import { test, expect } from '@playwright/test';

test.describe('BOLO Management', { tag: '@auth' }, () => {
  test('BOLO section is visible on command dashboard', async ({ page }) => {
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    // Wait for dashboard to finish loading
    await expect(page.locator('#dd-panels')).toBeVisible({ timeout: 15_000 });

    // Verify the Active BOLOs column header is visible in the MDT overview
    await expect(page.locator('#cd-mdt-col-intel .cd-mdt-col-header')).toBeVisible({ timeout: 10_000 });
  });

  test('can navigate to focused BOLO view via sidebar', async ({ page }) => {
    await page.goto('/command-dashboard#createBolos');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#dd-panels')).toBeVisible({ timeout: 15_000 });

    // In focused mode, the BOLO component renders in its own card
    // with the New BOLO button visible
    await expect(page.locator('#dd-component-createBolos')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#dd-component-createBolos .cd-bolo-new-btn')).toBeVisible({ timeout: 10_000 });
  });
});
