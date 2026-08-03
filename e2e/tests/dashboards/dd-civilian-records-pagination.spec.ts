import { test, expect } from '@playwright/test';
import { TEST_CIVILIAN, TEST_CIVILIAN_ID, TEST_COMMUNITY_ID } from '../../helpers/seed';
import {
  addPoliceDepartment,
  removeDepartmentById,
  createTestArrestReports,
  deleteArrestReportsByArresteeId,
  encodeIdForUrl,
} from '../../helpers/db';

/**
 * Regression guard for the arrest-report pagination bug.
 *
 * GET /api/v1/arrest-report/arrestee/{id} is paginated: it returns the full
 * history size in `totalCount` but only one page in `data`, defaulting to 10
 * per page. The civilian Records panel used to call it bare, so a civilian
 * with more than 10 arrests could only ever see (and contest) the first 10.
 *
 * The fixture is deliberately larger than *both* the endpoint's 10-per-page
 * default and the 25-per-page size the client walks with, so this fails if the
 * walk regresses to a single request either way.
 */
const ARREST_COUNT = 30;

test.describe('Department dashboard — civilian records pagination', { tag: '@auth' }, () => {
  let deptId: string;
  const civilianId = TEST_CIVILIAN_ID.toHexString();
  const civilianName = `${TEST_CIVILIAN.firstName} ${TEST_CIVILIAN.lastName}`;

  test.beforeEach(async () => {
    // The seeded department carries no template components, so the Civilians
    // panel wouldn't render. addPoliceDepartment enables createCivilians.
    deptId = await addPoliceDepartment({ name: 'E2E Records PD' });
    await deleteArrestReportsByArresteeId(civilianId);
    await createTestArrestReports({
      civilianId,
      civilianName,
      count: ARREST_COUNT,
      departmentId: deptId,
    });
  });

  test.afterEach(async () => {
    await deleteArrestReportsByArresteeId(civilianId);
    await removeDepartmentById(deptId);
  });

  test('Records tab lists every arrest report, not just the first page', async ({ page }) => {
    const communityB64 = encodeIdForUrl(TEST_COMMUNITY_ID.toHexString());
    const deptB64 = encodeIdForUrl(deptId);
    await page.goto(
      `/department-dashboard?dept=E2E%20Records%20PD&c=${encodeURIComponent(communityB64)}&d=${encodeURIComponent(deptB64)}`
    );
    await expect(page).not.toHaveURL(/\/login/);

    // Open the Civilians panel. If the nav never renders, the dashboard didn't
    // get its department data — skip rather than fail on an offline API.
    const civNav = page.locator('#dd-nav-components .dd-nav-item[data-panel="createCivilians"]');
    const navReady = await civNav
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!navReady) {
      test.skip(true, 'Civilians panel nav not reachable — API may be offline');
      return;
    }
    await civNav.click();

    // Open the seeded civilian's detail overlay.
    const civCard = page.locator(`.dd-civ-card[data-civ-id="${civilianId}"]`);
    await expect(civCard).toBeVisible({ timeout: 15_000 });
    await civCard.click();

    // Records tab.
    const recordsTab = page.locator('.dd-civ-tab[data-tab="records"]');
    await expect(recordsTab).toBeVisible({ timeout: 10_000 });
    await recordsTab.click();

    // The Arrests filter chip is rendered from the accumulated list, so it is
    // the count the user sees. Pre-fix this read "Arrests (10)".
    const arrestFilter = page.locator('.dd-rec-filter-btn[data-filter="Arrest"]');
    await expect(arrestFilter).toHaveText(`Arrests (${ARREST_COUNT})`, { timeout: 20_000 });

    // Narrow to arrests only and confirm the list matches the count — the whole
    // point of the bug was the two disagreeing.
    await arrestFilter.click();
    await expect(page.locator('#dd-civ-d-body .dd-civ-record')).toHaveCount(ARREST_COUNT);

    // Every arrest must also be contestable; the old cap silently blocked
    // civilians from contesting anything past the first page.
    await expect(
      page.locator('#dd-civ-d-body .dd-rec-contest-cb[data-item-type="arrest"]')
    ).toHaveCount(ARREST_COUNT);

    // Reports from the last page must actually be present, not just counted.
    await expect(
      page.locator('#dd-civ-d-body .dd-civ-record', { hasText: `E2E Charge ${ARREST_COUNT}` })
    ).toHaveCount(1);
  });
});
