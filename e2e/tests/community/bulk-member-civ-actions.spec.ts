import { test, expect } from '@playwright/test';
import { CommunityAdminListsPage, fakeId, FakeMember, FakeCivilian } from '../../pages/community-admin-lists.page';

function last<T>(items: T[]): T | undefined {
  return items[items.length - 1];
}

// The seeded test user owns the seeded community, so they see the kick and
// delete actions. Lists come from the stubs in the page object.

// 45 members at 20 a page: three pages.
const MEMBERS: FakeMember[] = Array.from({ length: 45 }, (_, i) => ({
  id: fakeId('5e', i),
  username: i % 2 === 0 ? `officer${i}` : `civ${i}`,
}));

// 25 civilians at 10 a page: three pages.
const CIVILIANS: FakeCivilian[] = Array.from({ length: 25 }, (_, i) => ({
  id: fakeId('c1', i),
  name: i % 5 === 0 ? `Smith Number${i}` : `Jones Number${i}`,
}));

test.describe('Community admin: bulk kick members', { tag: '@auth' }, () => {
  let lists: CommunityAdminListsPage;

  test.beforeEach(async ({ page }) => {
    lists = new CommunityAdminListsPage(page);
    await lists.stubMembers(MEMBERS);
    const ok = await lists.goto();
    test.skip(!ok, 'Community API not reachable, the community page did not render');
    await lists.openMembers();
  });

  test('kicks the selected members with one confirm that shows the count, and stays on the same page', async () => {
    // Go to page 2.
    await lists.page.locator('#nextPageBtn').click();
    await expect(lists.membersPageInfo).toHaveText('Page 2 of 3');

    const a = MEMBERS[20].id;
    const b = MEMBERS[21].id;
    await lists.memberCheckbox(a).check();
    await lists.memberCheckbox(b).check();
    await expect(lists.membersSelectedCount).toHaveText('2 selected');
    await expect(lists.membersBulkKickBtn).toHaveText('Kick 2');

    await lists.membersBulkKickBtn.click();
    await expect(lists.confirmModal).toBeVisible();
    await expect(lists.confirmMessage.locator('strong')).toHaveText('2 members');

    const listCallsBefore = lists.memberListRequests.length;
    const bulk = await lists.expectRequestAfter(
      () => lists.confirmButton.click(),
      (r) => r.method() === 'POST' && r.url().includes('/members/bulk-remove'),
    );
    expect(bulk.postDataJSON()).toEqual({ userIds: [a, b] });

    // The rows go, and the list refreshes on page 2, not page 1.
    await expect(lists.memberCheckbox(a)).toHaveCount(0);
    await expect.poll(() => lists.memberListRequests.length).toBeGreaterThan(listCallsBefore);
    const refetch = last(lists.memberListRequests)!;
    expect(refetch.searchParams.get('page')).toBe('2');
    expect(refetch.searchParams.get('status')).toBe('approved');
    await expect(lists.membersPageInfo).toHaveText('Page 2 of 3');
  });

  test('keeps the search after a kick', async () => {
    await lists.memberSearchInput.fill('officer');
    await expect.poll(() => lists.memberListRequests.some((u) => u.pathname.endsWith('/search'))).toBe(true);
    await expect(lists.memberRows.first()).toContainText('officer');

    const target = MEMBERS[2].id;
    await lists.memberCheckbox(target).check();
    await lists.membersBulkKickBtn.click();
    await expect(lists.confirmMessage.locator('strong')).toHaveText('1 member');

    const searchesBefore = lists.memberListRequests.filter((u) => u.pathname.endsWith('/search')).length;
    await lists.confirmButton.click();

    await expect.poll(() => lists.memberListRequests.filter((u) => u.pathname.endsWith('/search')).length).toBeGreaterThan(searchesBefore);
    const latest = last(lists.memberListRequests)!;
    expect(latest.pathname.endsWith('/search')).toBe(true);
    expect(latest.searchParams.get('q')).toBe('officer');
    await expect(lists.memberSearchInput).toHaveValue('officer');
    await expect(lists.memberCheckbox(target)).toHaveCount(0);
    // Still only search matches on screen.
    await expect(lists.memberRows.filter({ hasText: /civ\d+/ })).toHaveCount(0);
  });
});

test.describe('Community admin: bulk delete civilians', { tag: '@auth' }, () => {
  let lists: CommunityAdminListsPage;

  test.beforeEach(async ({ page }) => {
    lists = new CommunityAdminListsPage(page);
    await lists.stubCivilians(CIVILIANS);
    const ok = await lists.goto();
    test.skip(!ok, 'Community API not reachable, the community page did not render');
    await lists.openCivilians();
  });

  test('deletes every civilian on the page with one confirm that shows the count, and stays on that page', async () => {
    await lists.civiliansPageButton(2).click();
    await expect.poll(() => last(lists.civilianListRequests)?.searchParams.get('page')).toBe('2');
    await expect(lists.civilianCheckbox(CIVILIANS[10].id)).toBeVisible();

    await lists.civiliansSelectAll.check();
    await expect(lists.civiliansSelectedCount).toHaveText('10 selected');
    await expect(lists.civiliansBulkDeleteBtn).toHaveText('Delete 10');

    await lists.civiliansBulkDeleteBtn.click();
    await expect(lists.deleteCivilianModal).toBeVisible();
    await expect(lists.deleteCivilianMessage.locator('strong')).toHaveText('10 characters');

    const listCallsBefore = lists.civilianListRequests.length;
    const bulk = await lists.expectRequestAfter(
      () => lists.deleteCivilianConfirmBtn.click(),
      (r) => r.method() === 'POST' && r.url().includes('/civilians/bulk-delete'),
    );
    expect(bulk.postDataJSON()).toEqual({ civilianIds: CIVILIANS.slice(10, 20).map((c) => c.id) });

    // Refreshes page 2, which now holds what used to be page 3.
    await expect.poll(() => lists.civilianListRequests.length).toBeGreaterThan(listCallsBefore);
    expect(last(lists.civilianListRequests)?.searchParams.get('page')).toBe('2');
    await expect(lists.civilianCheckbox(CIVILIANS[20].id)).toBeVisible();
    await expect(lists.civilianCheckbox(CIVILIANS[0].id)).toHaveCount(0);
  });

  test('a single delete keeps the page too', async () => {
    await lists.civiliansPageButton(2).click();
    await expect(lists.civilianCheckbox(CIVILIANS[11].id)).toBeVisible();

    const listCallsBefore = lists.civilianListRequests.length;
    await lists.civilianRows
      .filter({ has: lists.civilianCheckbox(CIVILIANS[11].id) })
      .getByRole('button', { name: /Delete/ })
      .click();
    await expect(lists.deleteCivilianModal).toBeVisible();
    await lists.deleteCivilianConfirmBtn.click();

    await expect.poll(() => lists.civilianListRequests.length).toBeGreaterThan(listCallsBefore);
    expect(last(lists.civilianListRequests)?.searchParams.get('page')).toBe('2');
    await expect(lists.civilianCheckbox(CIVILIANS[11].id)).toHaveCount(0);
    await expect(lists.civilianCheckbox(CIVILIANS[12].id)).toBeVisible();
  });

  test('re-runs the active search after a bulk delete', async () => {
    await lists.civiliansSearchInput.fill('Smith');
    await expect.poll(() => lists.civilianSearchBodies.length).toBeGreaterThan(0);
    await expect(lists.civilianRows).toHaveCount(5);

    await lists.civilianCheckbox(CIVILIANS[0].id).check();
    await lists.civilianCheckbox(CIVILIANS[5].id).check();
    await lists.civiliansBulkDeleteBtn.click();
    await expect(lists.deleteCivilianMessage.locator('strong')).toHaveText('2 characters');

    const searchesBefore = lists.civilianSearchBodies.length;
    await lists.deleteCivilianConfirmBtn.click();

    await expect.poll(() => lists.civilianSearchBodies.length).toBeGreaterThan(searchesBefore);
    expect(last(lists.civilianSearchBodies)?.query).toBe('Smith');
    await expect(lists.civiliansSearchInput).toHaveValue('Smith');
    await expect(lists.civilianRows).toHaveCount(3);
  });
});
