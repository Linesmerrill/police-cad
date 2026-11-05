import { test, expect, type Page } from '@playwright/test';

/*
 * Regression: a community owner saw their own private departments locked in
 * the command dashboard sidebar, with "Access Restricted" on click, while the
 * community's departments page let them straight in.
 *
 * The sidebar read ownerID and role off dbUser.user.lastAccessedCommunity,
 * which only holds {communityID, createdAt}, so the owner/admin bypass was
 * always false. Both now come from the community being viewed.
 *
 * The community and department payloads are stubbed so the three cases
 * (owner, administrator, neither) are exercised against the same private
 * department without touching the shared seed.
 */

const TEST_USER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const SOMEONE_ELSE_ID = 'ffffffffffffffffffffffff';
const PRIVATE_DEPT_NAME = 'Test Fire';

type CommunityStub = { ownerID: string; roles?: unknown[] };

async function stubSidebar(page: Page, community: CommunityStub) {
  // A private department the user is not a member of: without a bypass it
  // renders locked.
  await page.route('**/api/v1/community/*/departments', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        departments: [
          {
            _id: '222222222222222222222222',
            name: PRIVATE_DEPT_NAME,
            description: 'Private fire department',
            approvalRequired: true,
            members: [],
            ranks: [],
            template: { name: 'fire', category: 'fire' },
          },
        ],
      }),
    });
  });

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
          ownerID: community.ownerID,
          roles: community.roles || [],
          tenCodes: [],
          members: {},
        },
      }),
    });
  });
}

function privateDept(page: Page) {
  return page.locator('.cd-dept-item', { hasText: PRIVATE_DEPT_NAME });
}

test.describe('Command Dashboard — sidebar department access', () => {
  test('the community owner can open a private department', { tag: '@auth' }, async ({ page }) => {
    await stubSidebar(page, { ownerID: TEST_USER_ID });
    await page.goto('/command-dashboard');

    const dept = privateDept(page);
    await expect(dept).toHaveCount(1);
    await expect(dept).not.toHaveClass(/locked/);
    await expect(dept.locator('i.fa-lock')).toHaveCount(0);
  });

  test('a member of an administrator role can open it too', { tag: '@auth' }, async ({ page }) => {
    await stubSidebar(page, {
      ownerID: SOMEONE_ELSE_ID,
      roles: [
        {
          name: 'Head Admin',
          members: [TEST_USER_ID],
          permissions: [{ name: 'administrator', enabled: true }],
        },
      ],
    });
    await page.goto('/command-dashboard');

    const dept = privateDept(page);
    await expect(dept).toHaveCount(1);
    await expect(dept).not.toHaveClass(/locked/);
  });

  test('someone who is neither still sees it locked', { tag: '@auth' }, async ({ page }) => {
    await stubSidebar(page, {
      ownerID: SOMEONE_ELSE_ID,
      roles: [
        {
          name: 'Officer',
          members: [TEST_USER_ID],
          permissions: [{ name: 'administrator', enabled: false }],
        },
      ],
    });
    await page.goto('/command-dashboard');

    const dept = privateDept(page);
    await expect(dept).toHaveCount(1);
    await expect(dept).toHaveClass(/locked/);
    await expect(dept.locator('i.fa-lock')).toHaveCount(1);
  });
});
