import { test, expect, Page } from '@playwright/test';
import { DispatchBridgePage } from '../../pages/dispatch-bridge.page';
import { TEST_COMMUNITY_ID, TEST_DISPATCH_DEPT_ID } from '../../helpers/seed';
import { setBetaCommandDispatch, deleteUserPreferences, encodeIdForUrl } from '../../helpers/db';

// Bulk unit status on the Dispatch Command Bridge: "Select units" switches the
// roster into select mode, where chip clicks toggle selection instead of
// opening the unit console. One status is then applied to every selected unit
// with a single PUT to the bulk endpoint. Units and the bulk endpoint are
// stubbed (statefully, so the roster's background refresh agrees with the
// change); the community payload is the seeded one plus two ten-codes.

const UNIT_A = '64b0000000000000000000b1';
const UNIT_B = '64b0000000000000000000b2';
const UNIT_C = '64b0000000000000000000b3';
const CODE_AVAILABLE = '64b0000000000000000000d1';
const CODE_BUSY = '64b0000000000000000000d2';

type BulkBody = { userIds: string[]; tenCodeId: string };

const TEN_CODES = [
  { _id: CODE_AVAILABLE, code: '10-8', description: 'Available' },
  { _id: CODE_BUSY, code: '10-6', description: 'Busy' },
];

async function stubBridge(page: Page, bulk: { status: number; body?: unknown } = { status: 200 }) {
  const codes: Record<string, string> = { [UNIT_A]: CODE_AVAILABLE, [UNIT_B]: CODE_AVAILABLE, [UNIT_C]: CODE_AVAILABLE };
  const requests: BulkBody[] = [];

  // Real community, with ten-codes added so the status picker has options.
  await page.route('**/api/v1/community/*', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    const json = await response.json();
    const community = json.community || json;
    community.tenCodes = TEN_CODES;
    await route.fulfill({ response, json });
  });

  await page.route('**/api/v2/community/*/units*', async (route) => {
    const unit = (id: string, username: string, cs: string) => {
      const tc = TEN_CODES.find((c) => c._id === codes[id])!;
      return {
        id,
        username,
        globalCallSign: cs,
        resolvedCallSign: cs,
        activeDepartmentId: 'dept-pd',
        activeDepartmentName: 'Test PD',
        departmentCallSigns: { 'dept-pd': cs },
        tenCode: { id: tc._id, code: tc.code },
        departments: [{ id: 'dept-pd', name: 'Test PD', template: 'police' }],
      };
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        units: [unit(UNIT_A, 'alpha.unit', 'P-1'), unit(UNIT_B, 'bravo.unit', 'P-2'), unit(UNIT_C, 'charlie.unit', 'P-3')],
        totalCount: 3,
        page: 1,
        limit: 100,
      }),
    });
  });

  await page.route('**/members/tenCode/bulk', async (route) => {
    const body = route.request().postDataJSON() as BulkBody;
    requests.push(body);
    if (bulk.status !== 200) {
      return route.fulfill({ status: bulk.status, contentType: 'application/json', body: JSON.stringify(bulk.body ?? {}) });
    }
    for (const id of body.userIds) codes[id] = body.tenCodeId;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: body.userIds.map((id) => ({ id, ok: true })),
        succeeded: body.userIds.length,
        failed: 0,
      }),
    });
  });

  return { requests };
}

test.describe('Dispatch Command Bridge — bulk unit status', () => {
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

  const statusPicker = (page: Page) => page.locator('#cd-roster-bulk-status');
  const applyBtn = (page: Page) => page.locator('[data-action="bulk-apply"]');

  test('select mode applies one status to the selected units', { tag: '@auth' }, async ({ page }) => {
    const { requests } = await stubBridge(page);
    const bridge = new DispatchBridgePage(page);
    await page.goto(dispatchUrl);
    await bridge.expectLoaded();
    await expect(bridge.unitChipByUserId(UNIT_A)).toBeVisible();

    await page.locator('[data-action="bulk-toggle-mode"]').click();
    // In select mode a chip click selects instead of opening the console.
    await bridge.unitChipByUserId(UNIT_A).click();
    await bridge.unitChipByUserId(UNIT_B).click();
    await expect(bridge.unitChipByUserId(UNIT_A)).toHaveClass(/is-selected/);
    await expect(bridge.unitChipByUserId(UNIT_C)).not.toHaveClass(/is-selected/);
    await expect(page.locator('.cd-roster-bulk-count')).toHaveText('2 selected');
    await expect(page.locator('#cd-unit-console-overlay')).toHaveCount(0);

    await statusPicker(page).selectOption(CODE_BUSY);
    await applyBtn(page).click();

    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].tenCodeId).toBe(CODE_BUSY);
    expect([...requests[0].userIds].sort()).toEqual([UNIT_A, UNIT_B]);

    await expect(bridge.unitChipByUserId(UNIT_A).locator('.cd-unit-chip-code')).toHaveText('10-6');
    await expect(bridge.unitChipByUserId(UNIT_B).locator('.cd-unit-chip-code')).toHaveText('10-6');
    await expect(bridge.unitChipByUserId(UNIT_C).locator('.cd-unit-chip-code')).toHaveText('10-8');
    await expect(page.locator('#cd-toast-stack')).toContainText('2 units set to 10-6');
    await expect(page.locator('.cd-roster-bulk-count')).toHaveText('0 selected');
  });

  test('select all picks every unit in the roster', { tag: '@auth' }, async ({ page }) => {
    const { requests } = await stubBridge(page);
    const bridge = new DispatchBridgePage(page);
    await page.goto(dispatchUrl);
    await bridge.expectLoaded();
    await expect(bridge.unitChipByUserId(UNIT_A)).toBeVisible();

    await page.locator('[data-action="bulk-toggle-mode"]').click();
    await page.locator('#cd-roster-select-all').check();
    await expect(page.locator('.cd-roster-bulk-count')).toHaveText('3 selected');

    await statusPicker(page).selectOption(CODE_BUSY);
    await applyBtn(page).click();

    await expect.poll(() => requests.length).toBe(1);
    expect([...requests[0].userIds].sort()).toEqual([UNIT_A, UNIT_B, UNIT_C]);
    for (const id of [UNIT_A, UNIT_B, UNIT_C]) {
      await expect(bridge.unitChipByUserId(id).locator('.cd-unit-chip-code')).toHaveText('10-6');
    }

    // Leaving select mode restores click-to-open-console.
    await page.locator('[data-action="bulk-toggle-mode"]').click();
    await expect(bridge.unitChipByUserId(UNIT_A)).not.toHaveClass(/is-selecting/);
  });

  test('a forbidden bulk change shows an error and changes nothing', { tag: '@auth' }, async ({ page }) => {
    const { requests } = await stubBridge(page, {
      status: 403,
      body: { response: { message: 'insufficient permissions', error: 'forbidden' } },
    });
    const bridge = new DispatchBridgePage(page);
    await page.goto(dispatchUrl);
    await bridge.expectLoaded();
    await expect(bridge.unitChipByUserId(UNIT_A)).toBeVisible();

    await page.locator('[data-action="bulk-toggle-mode"]').click();
    await bridge.unitChipByUserId(UNIT_A).click();
    await statusPicker(page).selectOption(CODE_BUSY);
    await applyBtn(page).click();

    await expect.poll(() => requests.length).toBe(1);
    await expect(page.locator('#cd-toast-stack')).toContainText("You don't have permission to set unit statuses");
    await expect(bridge.unitChipByUserId(UNIT_A).locator('.cd-unit-chip-code')).toHaveText('10-8');
    await expect(page.locator('.cd-roster-bulk-count')).toHaveText('1 selected');
  });
});
