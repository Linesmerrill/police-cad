import { test, expect } from '@playwright/test';

test.describe('BOLO Management', { tag: '@auth' }, () => {
  test('can navigate to BOLOs section', async ({ page }) => {
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    // Navigate to BOLOs via the launcher or tab
    const boloNav = page.locator(
      '.cd-mdt-launcher-item:has-text("BOLO"), ' +
      '.cd-mdt-search-tab[data-search="bolos"], ' +
      '[onclick*="createBolos"], ' +
      'button:has-text("BOLO")'
    ).first();
    await expect(boloNav).toBeVisible({ timeout: 15_000 });
    await boloNav.click();

    // The BOLO section should now be visible with the new BOLO button
    const newBoloBtn = page.locator('#cd-bolo-new-btn, .cd-bolo-new-btn').first();
    await expect(newBoloBtn).toBeVisible({ timeout: 10_000 });
  });
});
