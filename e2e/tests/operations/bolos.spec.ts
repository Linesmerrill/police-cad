import { test, expect } from '@playwright/test';

test.describe('BOLO Management', { tag: '@auth' }, () => {
  test('can view BOLOs section on command dashboard', async ({ page }) => {
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    // Wait for dashboard to finish loading
    await expect(page.locator('#dd-panels')).toBeVisible({ timeout: 15_000 });

    // On desktop, BOLOs are in the right MDT column (visible).
    // There are duplicate #cd-bolo-new-btn elements (overview + hidden focused card),
    // so scope to the visible MDT intel column.
    const boloBtn = page.locator('#cd-mdt-intel-content #cd-bolo-new-btn');
    await expect(boloBtn).toBeVisible({ timeout: 10_000 });
  });
});
