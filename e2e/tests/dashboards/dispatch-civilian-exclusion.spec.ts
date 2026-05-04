import { test, expect } from '@playwright/test';

// Regression: civilians (users whose only community department uses the
// "Civilian" template) must not appear in the dispatch dashboard's unit grid.
// Dispatchers cannot assign civilians to calls, so showing them clutters the
// "All" view and is unrealistic. This test stubs the v2 units endpoint with a
// mixed roster and asserts only the LE/Fire/EMS users render.

test.describe('Dispatch Dashboard — civilian exclusion', () => {
  test(
    'civilian-only users are excluded from the unit grid and the dept filter',
    { tag: '@auth' },
    async ({ page }) => {
      // Stub the community payload (just enough to satisfy loadUnitsPanel).
      await page.route('**/api/v1/community/*', async (route) => {
        if (route.request().method() !== 'GET') {
          return route.continue();
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            community: {
              _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
              name: 'Test Community',
              ownerID: 'aaaaaaaaaaaaaaaaaaaaaaaa',
              tenCodes: [],
              roles: [],
              members: {},
            },
          }),
        });
      });

      // Stub the v2 units endpoint with three users:
      //   1. officer-le — only Police dept → must render
      //   2. civ-only   — only Civilian dept → MUST NOT render
      //   3. dual-role  — Civilian + Fire    → must render (LE-side dept)
      await page.route('**/api/v2/community/*/units*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            units: [
              {
                id: 'unit-officer-le',
                username: 'officer.le',
                globalCallSign: 'P-1',
                profilePicture: '',
                activeDepartmentId: 'dept-pd',
                activeDepartmentName: 'Test PD',
                departmentCallSigns: { 'dept-pd': 'P-1' },
                departments: [{ id: 'dept-pd', name: 'Test PD', template: 'Police' }],
              },
              {
                id: 'unit-civ-only',
                username: 'civ.only',
                globalCallSign: '',
                profilePicture: '',
                departmentCallSigns: {},
                departments: [{ id: 'dept-civ', name: 'Civilians', template: 'Civilian' }],
              },
              {
                id: 'unit-dual-role',
                username: 'dual.role',
                globalCallSign: 'F-7',
                profilePicture: '',
                activeDepartmentId: 'dept-fd',
                activeDepartmentName: 'Test FD',
                departmentCallSigns: { 'dept-fd': 'F-7' },
                departments: [
                  { id: 'dept-civ', name: 'Civilians', template: 'Civilian' },
                  { id: 'dept-fd', name: 'Test FD', template: 'Fire' },
                ],
              },
            ],
            totalCount: 3,
            page: 1,
            limit: 100,
          }),
        });
      });

      await page.goto('/dispatch-dashboard');
      await expect(page).not.toHaveURL(/\/login/);

      // Wait for the unit grid to populate.
      await expect(page.locator('#unitGrid .unit-card').first()).toBeVisible({ timeout: 10_000 });

      // Eligible units render.
      await expect(page.locator('#unitGrid .unit-card[data-user-id="unit-officer-le"]')).toHaveCount(1);
      await expect(page.locator('#unitGrid .unit-card[data-user-id="unit-dual-role"]')).toHaveCount(1);

      // Civilian-only user is filtered out client-side.
      await expect(page.locator('#unitGrid .unit-card[data-user-id="unit-civ-only"]')).toHaveCount(0);

      // The dept filter must only offer non-Civilian options. Open it and
      // assert no checkbox carries the "Civilians" label.
      await page.locator('#departmentFilterToggle').click();
      const deptOptions = page.locator('#departmentFilterMenu .dept-filter-option');
      await expect(deptOptions).toHaveCount(2);
      await expect(deptOptions.filter({ hasText: 'Civilians' })).toHaveCount(0);
      await expect(deptOptions.filter({ hasText: 'Test PD' })).toHaveCount(1);
      await expect(deptOptions.filter({ hasText: 'Test FD' })).toHaveCount(1);
    },
  );

  test(
    'multiple LE departments can be shown simultaneously via the multi-select filter',
    { tag: '@auth' },
    async ({ page }) => {
      await page.route('**/api/v1/community/*', async (route) => {
        if (route.request().method() !== 'GET') {
          return route.continue();
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            community: {
              _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
              name: 'Test Community',
              ownerID: 'aaaaaaaaaaaaaaaaaaaaaaaa',
              tenCodes: [],
              roles: [],
              members: {},
            },
          }),
        });
      });

      await page.route('**/api/v2/community/*/units*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            units: [
              {
                id: 'unit-pd',
                username: 'pd.officer',
                globalCallSign: 'P-1',
                activeDepartmentId: 'dept-pd',
                activeDepartmentName: 'Test PD',
                departmentCallSigns: { 'dept-pd': 'P-1' },
                departments: [{ id: 'dept-pd', name: 'Test PD', template: 'Police' }],
              },
              {
                id: 'unit-so',
                username: 'so.deputy',
                globalCallSign: 'S-2',
                activeDepartmentId: 'dept-so',
                activeDepartmentName: 'Test SO',
                departmentCallSigns: { 'dept-so': 'S-2' },
                departments: [{ id: 'dept-so', name: 'Test SO', template: 'Police' }],
              },
              {
                id: 'unit-fd',
                username: 'fd.medic',
                globalCallSign: 'F-3',
                activeDepartmentId: 'dept-fd',
                activeDepartmentName: 'Test FD',
                departmentCallSigns: { 'dept-fd': 'F-3' },
                departments: [{ id: 'dept-fd', name: 'Test FD', template: 'Fire' }],
              },
            ],
            totalCount: 3,
            page: 1,
            limit: 100,
          }),
        });
      });

      await page.goto('/dispatch-dashboard');
      await expect(page.locator('#unitGrid .unit-card').first()).toBeVisible({ timeout: 10_000 });

      // All three render with no filter applied.
      await expect(page.locator('#unitGrid .unit-card')).toHaveCount(3);

      // Select PD + SO. Fire should drop out; PD and SO stay.
      await page.locator('#departmentFilterToggle').click();
      await page.locator('#departmentFilterMenu input[value="dept-pd"]').check();
      await page.locator('#departmentFilterMenu input[value="dept-so"]').check();

      await expect(page.locator('#unitGrid .unit-card[data-user-id="unit-pd"]')).toHaveCount(1);
      await expect(page.locator('#unitGrid .unit-card[data-user-id="unit-so"]')).toHaveCount(1);
      await expect(page.locator('#unitGrid .unit-card[data-user-id="unit-fd"]')).toHaveCount(0);
      await expect(page.locator('#departmentFilterLabel')).toHaveText('2 departments');
    },
  );
});
