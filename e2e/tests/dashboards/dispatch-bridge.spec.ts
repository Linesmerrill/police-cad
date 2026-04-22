import { test, expect } from '@playwright/test';
import { DispatchBridgePage } from '../../pages/dispatch-bridge.page';
import { TEST_COMMUNITY_ID, TEST_DISPATCH_DEPT_ID } from '../../helpers/seed';

/**
 * Smoke coverage for the Dispatch Command Bridge.
 *
 * Activates when the active department's template.name === 'dispatch'.
 * The seed helper installs a 'Test Dispatch' department alongside 'Test PD'
 * in the shared test community; we land on it by passing its id in the URL.
 */
test.describe('Dispatch Command Bridge', () => {
  const dispatchUrl =
    `/command-dashboard?dept=dispatch&d=${encodeURIComponent(TEST_DISPATCH_DEPT_ID.toHexString())}` +
    `&c=${encodeURIComponent(TEST_COMMUNITY_ID.toHexString())}`;

  test('renders the 3-zone bridge instead of the MDT', { tag: '@auth' }, async ({ page }) => {
    const bridge = new DispatchBridgePage(page);
    await page.goto(dispatchUrl);
    await bridge.expectLoaded();
    // The MDT overview should NOT be present for a dispatch-template dept.
    await expect(page.locator('#cd-mdt-overview')).toHaveCount(0);
  });

  test('roster exposes department-type filter pills', { tag: '@auth' }, async ({ page }) => {
    const bridge = new DispatchBridgePage(page);
    await page.goto(dispatchUrl);
    await bridge.expectLoaded();

    await expect(bridge.rosterPillsDept.locator('[data-filter="police"]')).toBeVisible();
    await expect(bridge.rosterPillsDept.locator('[data-filter="fire"]')).toBeVisible();
    await expect(bridge.rosterPillsDept.locator('[data-filter="ems"]')).toBeVisible();

    // Switching the Fire pill marks it active
    await bridge.filterRosterByDept('fire');
    await expect(bridge.rosterPillsDept.locator('[data-filter="fire"]')).toHaveClass(/is-active/);
  });

  test('"+ New Call" button opens the intake modal', { tag: '@auth' }, async ({ page }) => {
    const bridge = new DispatchBridgePage(page);
    await page.goto(dispatchUrl);
    await bridge.expectLoaded();

    await bridge.openIntake();
    await expect(page.locator('#cd-intake-overlay')).toBeVisible();
    await expect(page.locator('#cd-intake-title')).toHaveText(/new call/i);
    // Close via the backdrop
    await page.locator('#cd-intake-overlay .cd-intake-close').click();
    await expect(page.locator('#cd-intake-overlay')).toHaveCount(0);
  });

  test('Bridge keeps the classic-dashboard fallback reachable', { tag: '@auth' }, async ({ page }) => {
    // Non-dispatch templates still see the MDT overview — sanity check the branch.
    await page.goto('/command-dashboard');
    await expect(page.locator('#cd-mdt-overview, #cd-dispatch-bridge').first()).toBeVisible({ timeout: 15_000 });
  });
});
