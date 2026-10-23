/**
 * Read-only community preview for staff (views/admin-community-preview.ejs),
 * opened from a report so a "they copied my community" claim can be judged by
 * looking at both communities.
 *
 * The report page is mocked at the website proxy (/admin/api/reports/:id). The
 * preview itself renders on the server from the test API, against the seeded
 * test community.
 */
import { test, expect, Page, Route } from '@playwright/test';
import {
  seedReportReviewer,
  removeReportReviewer,
  TEST_REPORT_REVIEWER_EMAIL,
  TEST_REPORT_REVIEWER_PASSWORD,
} from '../../helpers/admin-users';
import { TEST_COMMUNITY_ID } from '../../helpers/seed';

const REPORT_ID = 'bbbbbbbbbbbbbbbbbbbbbbb2';
const COMMUNITY_ID = TEST_COMMUNITY_ID.toHexString();

const COMMUNITY_REPORT = {
  id: REPORT_ID,
  itemId: COMMUNITY_ID,
  itemType: 'community',
  reportedIssue: 'Impersonation',
  additionalDetails: 'They copied our logo and description.',
  reportedById: 'ccccccccccccccccccccccc2',
  createdAt: '2026-10-20T15:33:00Z',
  effectiveStatus: 'new',
  effectiveTier: 'minor',
  issueKnown: true,
  targetName: 'test community',
  reporterName: 'original-owner',
};

const PEOPLE = {
  reported: {
    id: 'ccccccccccccccccccccccc1',
    username: 'copycat',
    owned: [{ id: COMMUNITY_ID, name: 'test community', members: 3 }],
    joined: [],
    joinedTotal: 0,
  },
  reporter: {
    id: 'ccccccccccccccccccccccc2',
    username: 'original-owner',
    owned: [{ id: 'ddddddddddddddddddddddd2', name: 'Test Community', members: 40 }],
    joined: [],
    joinedTotal: 0,
  },
  nameMatches: [],
};

async function mockReport(page: Page, report: Record<string, unknown>) {
  await page.route(`**/admin/api/reports/${REPORT_ID}`, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ report, offenses: [], otherReports: [], reporterStats: { filed: 1 }, people: PEOPLE }),
    }));
}

async function login(page: Page) {
  await page.goto('/admin');
  await page.locator('input[name="email"]').fill(TEST_REPORT_REVIEWER_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_REPORT_REVIEWER_PASSWORD);
  await Promise.all([
    page.waitForURL(/\/admin\/(console|profile)/, { timeout: 15_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
}

const previewPath = (communityId: string) =>
  `/admin/community/${communityId}/preview?report=${REPORT_ID}`;

test.describe('Admin community preview', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeAll(async () => { await seedReportReviewer(); });
  test.afterAll(async () => { await removeReportReviewer(); });

  test('a community report offers a read-only preview, and so does each community in who\'s who', async ({ page }) => {
    await login(page);
    await mockReport(page, COMMUNITY_REPORT);
    await page.goto(`/admin/report/${REPORT_ID}`);

    const button = page.getByRole('link', { name: /Preview community page/ });
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('href', previewPath(COMMUNITY_ID));
    // A new tab, so the report stays where the reviewer left it.
    await expect(button).toHaveAttribute('target', '_blank');

    // The reporter's own community, the one they say was copied, opens the same way.
    const links = page.locator('a.preview-link');
    await expect(links).toHaveCount(2);
    await expect(links.nth(1)).toHaveAttribute('href', previewPath('ddddddddddddddddddddddd2'));
  });

  test('a report about a user has no community preview button', async ({ page }) => {
    await login(page);
    await mockReport(page, { ...COMMUNITY_REPORT, itemType: 'user', itemId: 'ccccccccccccccccccccccc1' });
    await page.goto(`/admin/report/${REPORT_ID}`);

    await expect(page.getByText('Who\'s who')).toBeVisible();
    await expect(page.getByRole('link', { name: /Preview community page/ })).toHaveCount(0);
  });

  test('the preview shows the community and gives nothing to act with', async ({ page }) => {
    await login(page);
    await page.goto(previewPath(COMMUNITY_ID));

    await expect(page.getByText('Staff preview, read only.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/test community/i);
    await expect(page.getByText(/Departments \(\d+\)/)).toBeVisible();
    await expect(page.getByText('Test PD')).toBeVisible();

    // Read only: no forms, fields or buttons in the page's own content.
    const content = page.locator('.wrap');
    await expect(content.locator('form, input, textarea, select, button')).toHaveCount(0);

    await expect(page.getByRole('link', { name: /Back to the report/ })).toHaveAttribute('href', `/admin/report/${REPORT_ID}`);
  });

  test('an unknown community says so rather than failing', async ({ page }) => {
    await login(page);
    const response = await page.goto(previewPath('eeeeeeeeeeeeeeeeeeeeeee9'));
    expect(response?.status()).toBe(404);
    await expect(page.getByText('This community no longer exists.')).toBeVisible();
  });

  test('a malformed id is refused', async ({ page }) => {
    await login(page);
    const response = await page.goto('/admin/community/not-an-id/preview');
    expect(response?.status()).toBe(400);
  });
});
