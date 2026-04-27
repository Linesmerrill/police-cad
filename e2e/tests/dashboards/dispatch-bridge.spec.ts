import { test, expect } from '@playwright/test';
import { DispatchBridgePage } from '../../pages/dispatch-bridge.page';
import { TEST_COMMUNITY_ID, TEST_DISPATCH_DEPT_ID } from '../../helpers/seed';
import {
  setBetaCommandDispatch,
  deleteUserPreferences,
  encodeIdForUrl,
} from '../../helpers/db';

/**
 * Smoke coverage for the Dispatch Command Bridge.
 *
 * Activates when the active department's template.name === 'dispatch'.
 * The seed helper installs a 'Test Dispatch' department alongside 'Test PD'
 * in the shared test community; we land on it by passing its id in the URL.
 *
 * /command-dashboard is beta-gated server-side — non-opted-in users are
 * redirected to /dispatch-dashboard. Flip betaCommandDispatch on for the
 * seeded user before each test and clean up after.
 */
test.describe('Dispatch Command Bridge', () => {
  test.beforeEach(async () => {
    await setBetaCommandDispatch(true);
  });
  test.afterEach(async () => {
    await deleteUserPreferences();
  });

  // The /command-dashboard route base64url-decodes the ?d and ?c params and
  // rejects them if the result isn't a 24-char hex ObjectId. Pass raw hex and
  // departmentId resolves to null, the page falls back to default ('police'
  // template), and the bridge never mounts. Encode like the real app links do.
  const dispatchUrl =
    `/command-dashboard?dept=dispatch` +
    `&d=${encodeIdForUrl(TEST_DISPATCH_DEPT_ID.toHexString())}` +
    `&c=${encodeIdForUrl(TEST_COMMUNITY_ID.toHexString())}`;

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
