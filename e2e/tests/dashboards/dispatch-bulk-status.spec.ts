import { test, expect, Page } from '@playwright/test';

// Bulk unit status on the classic dispatch dashboard: a dispatcher ticks
// several unit cards (or "Select all"), picks one status, and applies it with
// a single PUT to the bulk endpoint. The community and units endpoints are
// stubbed; the community stub is stateful so the reload a status broadcast
// triggers sees the new statuses, just as the real API would return them.

const UNIT_A = '64b0000000000000000000b1';
const UNIT_B = '64b0000000000000000000b2';
const UNIT_C = '64b0000000000000000000b3';
const CODE_AVAILABLE = '64b0000000000000000000d1';
const CODE_OUT = '64b0000000000000000000d2';

type BulkBody = { userIds: string[]; tenCodeId: string; departmentId?: string };

async function stubDispatch(page: Page, bulk: { status: number; body?: unknown } = { status: 200 }) {
  const members: Record<string, { tenCodeID: string }> = {
    [UNIT_A]: { tenCodeID: CODE_AVAILABLE },
    [UNIT_B]: { tenCodeID: CODE_AVAILABLE },
    [UNIT_C]: { tenCodeID: CODE_AVAILABLE },
  };
  const requests: BulkBody[] = [];

  await page.route('**/api/v1/community/*', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        community: {
          _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
          name: 'Test Community',
          ownerID: 'aaaaaaaaaaaaaaaaaaaaaaaa',
          tenCodes: [
            { _id: CODE_AVAILABLE, code: '10-8', description: 'Available' },
            { _id: CODE_OUT, code: '10-7', description: 'Out of Service' },
          ],
          roles: [],
          members,
        },
      }),
    });
  });

  await page.route('**/api/v2/community/*/units*', async (route) => {
    const unit = (id: string, username: string, cs: string) => ({
      id,
      username,
      globalCallSign: cs,
      activeDepartmentId: 'dept-pd',
      activeDepartmentName: 'Test PD',
      departmentCallSigns: { 'dept-pd': cs },
      departments: [{ id: 'dept-pd', name: 'Test PD', template: 'Police' }],
    });
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
    for (const id of body.userIds) members[id] = { tenCodeID: body.tenCodeId };
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

const card = (page: Page, id: string) => page.locator(`#unitGrid .unit-card[data-user-id="${id}"]`);

test.describe('Dispatch Dashboard — bulk unit status', () => {
  test('selected units get one status in a single bulk request', { tag: '@auth' }, async ({ page }) => {
    const { requests } = await stubDispatch(page);
    await page.goto('/dispatch-dashboard');
    await expect(card(page, UNIT_A)).toBeVisible({ timeout: 10_000 });

    // The bar stays hidden until something is selected.
    await expect(page.locator('#unitBulkBar')).toBeHidden();

    await card(page, UNIT_A).locator('.unit-select-checkbox').check();
    await card(page, UNIT_B).locator('.unit-select-checkbox').check();
    await expect(page.locator('#unitBulkBar')).toBeVisible();
    await expect(page.locator('#unitBulkCount')).toHaveText('2');
    await expect(card(page, UNIT_A)).toHaveClass(/selected/);

    // Applying without a status flags the field instead of sending.
    await page.locator('#unitBulkApply').click();
    await expect(page.locator('#unitBulkStatus')).toHaveClass(/field-error/);
    expect(requests).toHaveLength(0);

    await page.locator('#unitBulkStatus').selectOption(CODE_OUT);
    await page.locator('#unitBulkApply').click();

    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].tenCodeId).toBe(CODE_OUT);
    expect([...requests[0].userIds].sort()).toEqual([UNIT_A, UNIT_B]);

    await expect(card(page, UNIT_A).locator('.unit-status-select')).toHaveValue(CODE_OUT);
    await expect(card(page, UNIT_B).locator('.unit-status-select')).toHaveValue(CODE_OUT);
    await expect(card(page, UNIT_C).locator('.unit-status-select')).toHaveValue(CODE_AVAILABLE);
    await expect(page.locator('#realtime-toast-container')).toContainText('2 units set to 10-7');

    // Updated units leave the selection, so the bar goes away.
    await expect(page.locator('#unitBulkBar')).toBeHidden();
  });

  test('select all picks every listed unit', { tag: '@auth' }, async ({ page }) => {
    const { requests } = await stubDispatch(page);
    await page.goto('/dispatch-dashboard');
    await expect(card(page, UNIT_A)).toBeVisible({ timeout: 10_000 });

    await page.locator('#unitSelectAll').check();
    await expect(page.locator('#unitBulkCount')).toHaveText('3');
    await expect(page.locator('#unitGrid .unit-select-checkbox:checked')).toHaveCount(3);

    await page.locator('#unitBulkStatus').selectOption(CODE_OUT);
    await page.locator('#unitBulkApply').click();

    await expect.poll(() => requests.length).toBe(1);
    expect([...requests[0].userIds].sort()).toEqual([UNIT_A, UNIT_B, UNIT_C]);
    for (const id of [UNIT_A, UNIT_B, UNIT_C]) {
      await expect(card(page, id).locator('.unit-status-select')).toHaveValue(CODE_OUT);
    }
  });

  test('a forbidden bulk change shows an error and changes nothing', { tag: '@auth' }, async ({ page }) => {
    const { requests } = await stubDispatch(page, {
      status: 403,
      body: { response: { message: 'insufficient permissions', error: 'forbidden' } },
    });
    await page.goto('/dispatch-dashboard');
    await expect(card(page, UNIT_A)).toBeVisible({ timeout: 10_000 });

    await card(page, UNIT_A).locator('.unit-select-checkbox').check();
    await card(page, UNIT_C).locator('.unit-select-checkbox').check();
    await page.locator('#unitBulkStatus').selectOption(CODE_OUT);
    await page.locator('#unitBulkApply').click();

    await expect.poll(() => requests.length).toBe(1);
    const toast = page.locator('#realtime-toast-container');
    await expect(toast).toContainText('Failed to update statuses');
    await expect(toast).toContainText("You don't have permission to set unit statuses");
    await expect(card(page, UNIT_A).locator('.unit-status-select')).toHaveValue(CODE_AVAILABLE);
    // The selection is kept so the dispatcher can retry.
    await expect(page.locator('#unitBulkCount')).toHaveText('2');
  });
});
