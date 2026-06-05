import { test, expect } from '@playwright/test';
import { DepartmentDashboardPage } from '../../pages/department-dashboard.page';
import {
  addPoliceDepartment,
  removeDepartmentById,
  getFirearmBySerial,
  deleteFirearmById,
} from '../../helpers/db';

/**
 * Regression test for the firearm "shows STOLEN when it isn't" bug.
 *
 * The department-dashboard firearm UI (dd-firearms.js) used to encode the
 * stolen flag as "1"/"2" instead of the canonical "true"/"false" strings that
 * the mobile app, the API, and every other surface read. Its "2" (not stolen)
 * collided with legacy LEO readers that treat "2" as stolen, so a not-stolen
 * firearm displayed as STOLEN to officers.
 *
 * The bug lives entirely in the create/write path, so this test drives the real
 * create modal and asserts the PERSISTED value is canonical — that is the
 * assertion that fails before the fix (it stored "2"/"1").
 */
test.describe('Firearm stolen status — department dashboard', { tag: '@auth' }, () => {
  const DEPT_NAME = 'E2E Police';
  let deptId: string;
  const firearmIds: string[] = [];

  test.beforeEach(async () => {
    // Seed a police department with the Firearms component enabled so the
    // dashboard renders the create UI deterministically.
    deptId = await addPoliceDepartment({ name: DEPT_NAME, firearmsEnabled: true });
  });

  test.afterEach(async () => {
    for (const id of firearmIds) {
      await deleteFirearmById(id).catch(() => {});
    }
    firearmIds.length = 0;
    await removeDepartmentById(deptId).catch(() => {});
  });

  test('created NOT stolen persists isStolen "false" (never "2")', async ({ page }) => {
    const serial = `FA-NOTSTOLEN-${Date.now()}`;
    const name = `P8NotStolen${Date.now().toString(36)}`;

    const dash = new DepartmentDashboardPage(page);
    await dash.goto(DEPT_NAME, deptId);
    await dash.openFirearms();
    await dash.openNewFirearmModal();
    await dash.fillNewFirearm({ serial, name, stolen: false });
    await dash.submitNewFirearm();

    // Poll until the create round-trips, then assert the canonical value.
    let stored: any = null;
    await expect
      .poll(
        async () => {
          stored = await getFirearmBySerial(serial);
          return stored?.firearm?.isStolen ?? null;
        },
        { timeout: 10_000, message: 'firearm should persist with isStolen "false"' }
      )
      .toBe('false');

    if (stored?._id) firearmIds.push(stored._id.toString());
    // Explicitly pin the regression: the old encoding wrote "2" for not stolen.
    expect(stored.firearm.isStolen).not.toBe('2');
  });

  test('created stolen persists isStolen "true" (never "1")', async ({ page }) => {
    const serial = `FA-STOLEN-${Date.now()}`;
    const name = `P8Stolen${Date.now().toString(36)}`;

    const dash = new DepartmentDashboardPage(page);
    await dash.goto(DEPT_NAME, deptId);
    await dash.openFirearms();
    await dash.openNewFirearmModal();
    await dash.fillNewFirearm({ serial, name, stolen: true });
    await dash.submitNewFirearm();

    let stored: any = null;
    await expect
      .poll(
        async () => {
          stored = await getFirearmBySerial(serial);
          return stored?.firearm?.isStolen ?? null;
        },
        { timeout: 10_000, message: 'firearm should persist with isStolen "true"' }
      )
      .toBe('true');

    if (stored?._id) firearmIds.push(stored._id.toString());
    // The old encoding wrote "1" for stolen — also non-canonical.
    expect(stored.firearm.isStolen).not.toBe('1');
  });
});
