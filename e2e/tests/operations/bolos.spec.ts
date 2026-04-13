import { test, expect } from '@playwright/test';

test.describe('BOLO Management', { tag: '@auth' }, () => {
  test('can view BOLOs section on command dashboard', async ({ page }) => {
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    // Wait for dashboard to finish loading
    await expect(page.locator('#dd-panels')).toBeVisible({ timeout: 15_000 });

    // Debug: take screenshot to see actual dashboard state
    await page.screenshot({ path: 'e2e/test-results/bolo-debug.png', fullPage: true });

    // On desktop, BOLOs are in the right MDT column.
    // The BOLO header "Active BOLOs" is static HTML (not JS-rendered),
    // so check that first to verify the column is visible.
    const boloColHeader = page.locator('#cd-mdt-col-intel .cd-mdt-col-header');
    const boloHeaderVisible = await boloColHeader.isVisible({ timeout: 5_000 }).catch(() => false);

    if (boloHeaderVisible) {
      // Desktop: BOLO column visible in overview grid
      // Wait for JS to render the BOLO component into the column
      const boloBtn = page.locator('#cd-mdt-intel-content .cd-bolo-new-btn');
      await expect(boloBtn).toBeVisible({ timeout: 10_000 });
    } else {
      // Mobile/tablet: use sidebar nav to navigate to BOLOs
      const boloNav = page.locator('.dd-nav-item[data-panel="createBolos"]');
      await expect(boloNav).toBeVisible({ timeout: 5_000 });
      await boloNav.click();
      // In focused mode, the BOLO component renders in #dd-component-createBolos
      const boloBtn = page.locator('#dd-component-createBolos .cd-bolo-new-btn');
      await expect(boloBtn).toBeVisible({ timeout: 10_000 });
    }
  });
});
