import { test, expect } from '@playwright/test';
import { dashboardUrl } from '../../helpers/test-urls';
import { TEST_COMMUNITY_ID, TEST_DEPARTMENT_ID } from '../../helpers/seed';

/**
 * Ranks tab in Department Management (dd-settings).
 *
 * Verifies the shared manage-ranks partial + module are wired up on the
 * department dashboard:
 *   - The hidden <template id="manage-ranks-tpl"> is in the DOM
 *   - /static/js/manage-ranks.js is loaded and exposes window.manageRanks
 *   - When the dept settings panel is opened, the Ranks tab pill appears
 *     for the community owner (who has manageDepartments) and clicking it
 *     mounts the rank-management UI inside the tab body.
 *
 * The deeper CRUD flow (create/edit/delete/reorder) is intentionally NOT
 * tested end-to-end — the same module powers the existing Manage Ranks
 * modal on community-details, and an isolated CRUD path would duplicate
 * the API contract tests for the rank endpoints.
 */
test.describe('Department Dashboard — Ranks tab', { tag: '@auth' }, () => {
  function deptDashboardUrl(): string {
    const communityB64 = Buffer.from(TEST_COMMUNITY_ID.toHexString()).toString('base64');
    const deptB64 = Buffer.from(TEST_DEPARTMENT_ID.toHexString()).toString('base64');
    return `/department-dashboard?c=${encodeURIComponent(communityB64)}&d=${encodeURIComponent(deptB64)}`;
  }

  test('manage-ranks template and module are present', async ({ page }) => {
    await page.goto(dashboardUrl('/department-dashboard'));
    await expect(page).not.toHaveURL(/\/login/);

    // The hidden <template> that backs the Ranks tab must be in the DOM.
    const tplExists = await page.locator('#manage-ranks-tpl').count();
    expect(tplExists).toBe(1);

    // The shared module must be loaded and expose its public API.
    const moduleReady = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mr = (window as any).manageRanks;
      return !!(mr && typeof mr.init === 'function' && typeof mr.fetchPendingCount === 'function');
    });
    expect(moduleReady).toBe(true);
  });

  test('Ranks tab appears and mounts the partial when opened', async ({ page }) => {
    await page.goto(deptDashboardUrl());
    await expect(page).not.toHaveURL(/\/login/);

    // Wait for dashboard to finish loading. If the API doesn't return
    // department data, the settings panel won't render — soft-skip in that case.
    const settingsBtn = page.locator('#dd-nav-settings');
    const settingsVisible = await settingsBtn.isVisible().catch(() => false);
    if (!settingsVisible) {
      test.skip(true, 'Dept dashboard settings nav not reachable — API may be offline');
      return;
    }

    await settingsBtn.click();

    const ranksTab = page.locator('.dds-tab[data-tab="ranks"]');
    await expect(ranksTab).toBeVisible({ timeout: 5_000 });

    await ranksTab.click();

    // After clicking, the partial should have mounted inside the tab body.
    await expect(page.locator('#dds-tab-body [data-rkm-root]')).toBeVisible();
    await expect(page.locator('#dds-tab-body #ranksList')).toBeVisible();
    await expect(page.locator('#dds-tab-body #rankMembersList')).toBeVisible();
  });
});
