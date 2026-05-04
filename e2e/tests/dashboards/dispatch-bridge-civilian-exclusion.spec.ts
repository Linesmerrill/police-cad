import { test, expect } from '@playwright/test';
import { DispatchBridgePage } from '../../pages/dispatch-bridge.page';
import { TEST_COMMUNITY_ID, TEST_DISPATCH_DEPT_ID } from '../../helpers/seed';
import {
  setBetaCommandDispatch,
  deleteUserPreferences,
  encodeIdForUrl,
} from '../../helpers/db';

/**
 * Regression: civilians (and pure judges) must not appear in the Dispatch
 * Command Bridge roster. Dispatchers cannot assign them to calls, so showing
 * them in the "All" view is clutter and a realism break.
 *
 * Also covers the new multi-select dept pill behavior — toggling Police +
 * Fire shows both dept families' units simultaneously, while EMS-only units
 * drop out.
 */
test.describe('Dispatch Command Bridge — civilian exclusion + multi-select dept', () => {
  test.beforeEach(async () => {
    await setBetaCommandDispatch(true);
  });
  test.afterEach(async () => {
    await deleteUserPreferences();
  });

  const dispatchUrl =
    `/command-dashboard?dept=dispatch` +
    `&d=${encodeIdForUrl(TEST_DISPATCH_DEPT_ID.toHexString())}` +
    `&c=${encodeIdForUrl(TEST_COMMUNITY_ID.toHexString())}`;

  test(
    'civilian-only users are filtered out of the roster',
    { tag: '@auth' },
    async ({ page }) => {
      await page.route('**/api/v2/community/*/units*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            units: [
              {
                id: 'unit-pd-1',
                username: 'pd.officer',
                globalCallSign: 'P-1',
                resolvedCallSign: 'P-1',
                activeDepartmentId: 'dept-pd',
                activeDepartmentName: 'Test PD',
                departmentCallSigns: { 'dept-pd': 'P-1' },
                departments: [{ id: 'dept-pd', name: 'Test PD', template: 'police' }],
              },
              {
                id: 'unit-civ-1',
                username: 'civ.only',
                globalCallSign: '',
                departments: [{ id: 'dept-civ', name: 'Civilians', template: 'civilian' }],
              },
              {
                id: 'unit-fd-1',
                username: 'fd.medic',
                globalCallSign: 'F-7',
                resolvedCallSign: 'F-7',
                activeDepartmentId: 'dept-fd',
                activeDepartmentName: 'Test FD',
                departmentCallSigns: { 'dept-fd': 'F-7' },
                departments: [{ id: 'dept-fd', name: 'Test FD', template: 'fire' }],
              },
              {
                id: 'unit-judge-1',
                username: 'the.judge',
                departments: [{ id: 'dept-jud', name: 'Court', template: 'judicial' }],
              },
              {
                id: 'unit-dual-1',
                username: 'dual.role',
                globalCallSign: 'P-9',
                resolvedCallSign: 'P-9',
                activeDepartmentId: 'dept-pd',
                activeDepartmentName: 'Test PD',
                departmentCallSigns: { 'dept-pd': 'P-9' },
                departments: [
                  { id: 'dept-civ', name: 'Civilians', template: 'civilian' },
                  { id: 'dept-pd', name: 'Test PD', template: 'police' },
                ],
              },
            ],
            totalCount: 5,
            page: 1,
            limit: 100,
          }),
        });
      });

      const bridge = new DispatchBridgePage(page);
      await page.goto(dispatchUrl);
      await bridge.expectLoaded();

      // PD officer, FD medic, and the dual-role user render.
      await expect(bridge.unitChipByUserId('unit-pd-1')).toBeVisible();
      await expect(bridge.unitChipByUserId('unit-fd-1')).toBeVisible();
      await expect(bridge.unitChipByUserId('unit-dual-1')).toBeVisible();

      // Civilian-only user and pure judge are filtered out.
      await expect(bridge.unitChipByUserId('unit-civ-1')).toHaveCount(0);
      await expect(bridge.unitChipByUserId('unit-judge-1')).toHaveCount(0);
    },
  );

  test(
    'dept pills support multi-select (Police + Fire shown, EMS hidden)',
    { tag: '@auth' },
    async ({ page }) => {
      await page.route('**/api/v2/community/*/units*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            units: [
              {
                id: 'unit-pd-only',
                username: 'pd.unit',
                globalCallSign: 'P-1',
                resolvedCallSign: 'P-1',
                activeDepartmentId: 'dept-pd',
                activeDepartmentName: 'Test PD',
                departmentCallSigns: { 'dept-pd': 'P-1' },
                departments: [{ id: 'dept-pd', name: 'Test PD', template: 'police' }],
              },
              {
                id: 'unit-fd-only',
                username: 'fd.unit',
                globalCallSign: 'F-1',
                resolvedCallSign: 'F-1',
                activeDepartmentId: 'dept-fd',
                activeDepartmentName: 'Test FD',
                departmentCallSigns: { 'dept-fd': 'F-1' },
                departments: [{ id: 'dept-fd', name: 'Test FD', template: 'fire' }],
              },
              {
                id: 'unit-ems-only',
                username: 'ems.unit',
                globalCallSign: 'M-1',
                resolvedCallSign: 'M-1',
                activeDepartmentId: 'dept-ems',
                activeDepartmentName: 'Test EMS',
                departmentCallSigns: { 'dept-ems': 'M-1' },
                departments: [{ id: 'dept-ems', name: 'Test EMS', template: 'ems' }],
              },
            ],
            totalCount: 3,
            page: 1,
            limit: 100,
          }),
        });
      });

      const bridge = new DispatchBridgePage(page);
      await page.goto(dispatchUrl);
      await bridge.expectLoaded();

      // Default: empty filter set → all three eligible templates render.
      await expect(bridge.unitChipByUserId('unit-pd-only')).toBeVisible();
      await expect(bridge.unitChipByUserId('unit-fd-only')).toBeVisible();
      await expect(bridge.unitChipByUserId('unit-ems-only')).toBeVisible();

      // Toggle Police on, then Fire on. EMS should drop out; PD + FD remain.
      await bridge.filterRosterByDept('police');
      await bridge.filterRosterByDept('fire');

      await expect(bridge.unitChipByUserId('unit-pd-only')).toBeVisible();
      await expect(bridge.unitChipByUserId('unit-fd-only')).toBeVisible();
      await expect(bridge.unitChipByUserId('unit-ems-only')).toHaveCount(0);

      // Both pills carry is-active simultaneously.
      await expect(bridge.rosterPillsDept.locator('[data-filter="police"]')).toHaveClass(/is-active/);
      await expect(bridge.rosterPillsDept.locator('[data-filter="fire"]')).toHaveClass(/is-active/);

      // Toggling Police off leaves only Fire selected.
      await bridge.filterRosterByDept('police');
      await expect(bridge.unitChipByUserId('unit-pd-only')).toHaveCount(0);
      await expect(bridge.unitChipByUserId('unit-fd-only')).toBeVisible();

      // Clicking "All" clears every selection and shows everything again.
      await bridge.filterRosterByDept('all');
      await expect(bridge.rosterPillsDept.locator('[data-filter="all"]')).toHaveClass(/is-active/);
      await expect(bridge.unitChipByUserId('unit-pd-only')).toBeVisible();
      await expect(bridge.unitChipByUserId('unit-fd-only')).toBeVisible();
      await expect(bridge.unitChipByUserId('unit-ems-only')).toBeVisible();
    },
  );
});
