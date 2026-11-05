import { test, expect, type Page } from '@playwright/test';

/*
 * The dashboards must fetch the community in the URL, not the one in
 * lastAccessedCommunity.
 *
 * The routes resolve ?c= first for their own access gate, but the client
 * config was built from dbUser.user.lastAccessedCommunity.communityID alone.
 * lastAccessedCommunity is only written when a community page is visited, so a
 * dashboard reached by a link, a bookmark or in a second tab could show
 * another community's departments, ten-codes, calls and penal codes.
 */

// The seeded community, which is what lastAccessedCommunity points at.
const LAST_ACCESSED_COMMUNITY_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
// A different community, passed in the URL.
const URL_COMMUNITY_ID = '00000000000000000000c0de';

function encodeId(id: string) {
  return Buffer.from(id, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Records which community the sidebar asked for, and answers with an empty
// list so the page settles either way.
async function captureDepartmentFetches(page: Page) {
  const urls: string[] = [];
  await page.route('**/api/v1/community/*/departments', async (route) => {
    urls.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ departments: [] }),
    });
  });
  return urls;
}

async function expectFetchedUrlCommunity(page: Page, path: string) {
  const urls = await captureDepartmentFetches(page);
  await page.goto(`${path}?c=${encodeId(URL_COMMUNITY_ID)}`);

  await expect.poll(() => urls.length, { timeout: 15_000 }).toBeGreaterThan(0);
  expect(urls[0]).toContain(URL_COMMUNITY_ID);
  expect(urls[0]).not.toContain(LAST_ACCESSED_COMMUNITY_ID);
}

test.describe('Dashboards — the community in the URL wins', () => {
  test('the command dashboard loads the URL community', { tag: '@auth' }, async ({ page }) => {
    await expectFetchedUrlCommunity(page, '/command-dashboard');
  });

  test('the department dashboard loads the URL community', { tag: '@auth' }, async ({ page }) => {
    await expectFetchedUrlCommunity(page, '/department-dashboard');
  });

  test('with no ?c= it still falls back to the last accessed community', { tag: '@auth' }, async ({ page }) => {
    const urls = await captureDepartmentFetches(page);
    await page.goto('/command-dashboard');

    await expect.poll(() => urls.length, { timeout: 15_000 }).toBeGreaterThan(0);
    expect(urls[0]).toContain(LAST_ACCESSED_COMMUNITY_ID);
  });
});
