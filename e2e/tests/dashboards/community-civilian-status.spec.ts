/**
 * Community page, Manage Civilians list (public/js/community-details.js).
 *
 * Regression: every civilian whose approval status wasn't "approved" or
 * "pending" was labelled REJECTED, including no_status, which is what every
 * civilian has in a community that doesn't review civilians. Badges now only
 * show when the approval system is on, and only a real rejection says
 * Rejected. The civilians API is mocked; the approval flag comes from the
 * server-rendered data-approval-enabled attribute.
 */
import { test, expect, Page } from '@playwright/test';
import { encodeIdForUrl, TEST_COMMUNITY_ID } from '../../helpers/db';

const CIVILIANS = [
  { status: 'no_status', name: 'Justen Smithen' },
  { status: 'requested_review', name: 'Pat Pending' },
  { status: 'requires_edits', name: 'Eddie Edits' },
  { status: 'rejected', name: 'Rita Rejected' },
  { status: 'approved', name: 'Andy Approved' },
  { status: undefined, name: 'Old Timer' },
].map((c, i) => ({
  _id: `cccccccccccccccccccccc${String(i).padStart(2, '0')}`,
  civilian: { name: c.name, approvalStatus: c.status, gender: 'Male', birthday: '1994-02-12' },
  user: { username: `user${i}` },
}));

async function openCivilians(page: Page, approvalEnabled: boolean) {
  await page.route('**/api/v2/community/*/civilians**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        civilians: CIVILIANS,
        pagination: { currentPage: 1, limit: 10, totalCount: CIVILIANS.length, totalPages: 1 },
      }),
    }));
  await page.goto(`/community/${encodeIdForUrl(TEST_COMMUNITY_ID)}`);
  const list = page.locator('#civiliansList');
  await expect(list).toBeAttached({ timeout: 15_000 });
  await list.evaluate((el, on) => el.setAttribute('data-approval-enabled', on ? 'true' : 'false'), approvalEnabled);
  await page.evaluate(() => (window as unknown as { openCiviliansModal: () => void }).openCiviliansModal());
  await expect(list).toContainText('Justen Smithen');
  return list;
}

test.describe('Manage Civilians: approval badges', { tag: '@auth' }, () => {
  test('approvals off: no badges, nobody looks rejected', async ({ page }) => {
    const list = await openCivilians(page, false);
    await expect(list.locator('[data-civ-status]')).toHaveCount(0);
    await expect(list).not.toContainText(/rejected/i);
  });

  test('approvals on: each status gets its own label', async ({ page }) => {
    const list = await openCivilians(page, true);
    const badgeFor = (name: string) =>
      list.locator('div[onclick^="editCivilian"]', { hasText: name }).locator('[data-civ-status]');
    await expect(badgeFor('Justen Smithen')).toHaveText(/not submitted/i);
    await expect(badgeFor('Old Timer')).toHaveText(/not submitted/i);
    await expect(badgeFor('Pat Pending')).toHaveText(/pending/i);
    await expect(badgeFor('Eddie Edits')).toHaveText(/needs edits/i);
    await expect(badgeFor('Andy Approved')).toHaveText(/approved/i);
    await expect(list.locator('[data-civ-status="rejected"]')).toHaveCount(1);
    await expect(badgeFor('Rita Rejected')).toHaveText(/rejected/i);
  });
});
