/**
 * Report page (views/admin-report.ejs): the "Who's who" card shows the
 * reported account and the reporter side by side, so an impersonation claim
 * can be checked on the spot. The report API is mocked at the website proxy
 * (/admin/api/reports/:id).
 */
import { test, expect, Page, Route } from '@playwright/test';
import {
  seedReportReviewer,
  removeReportReviewer,
  TEST_REPORT_REVIEWER_EMAIL,
  TEST_REPORT_REVIEWER_PASSWORD,
} from '../../helpers/admin-users';

const REPORT_ID = 'bbbbbbbbbbbbbbbbbbbbbbb1';

const REPORT = {
  id: REPORT_ID,
  itemId: 'ccccccccccccccccccccccc1',
  itemType: 'user',
  reportedIssue: 'Impersonation',
  additionalDetails: 'Using my name of community and pretending to be me',
  reportedById: 'ccccccccccccccccccccccc2',
  createdAt: '2026-09-22T15:33:00Z',
  effectiveStatus: 'new',
  effectiveTier: 'minor',
  issueKnown: true,
  targetName: '1k-01 | government',
  reporterName: 'Tropical-Piton11',
};

const PEOPLE = {
  reported: {
    id: 'ccccccccccccccccccccccc1',
    username: '1k-01 | government',
    createdAt: '2026-03-16T16:01:14Z',
    owned: [{ id: 'ddddddddddddddddddddddd1', name: 'TROPICAL RP', members: 28, createdAt: '2026-04-04T02:03:46Z' }],
    joined: [{ id: 'ddddddddddddddddddddddd3', name: 'ATL', members: 40 }],
    joinedTotal: 1,
  },
  reporter: {
    id: 'ccccccccccccccccccccccc2',
    username: 'Tropical-Piton11',
    createdAt: '2026-09-19T20:23:52Z',
    owned: [{ id: 'ddddddddddddddddddddddd2', name: 'TROPICAL-RP', members: 4, createdAt: '2026-09-19T20:26:59Z' }],
    joined: [{ id: 'ddddddddddddddddddddddd1', name: 'TROPICAL RP', members: 28 }],
    joinedTotal: 1,
  },
  nameMatches: [
    { reporterName: 'TROPICAL-RP', reporterKind: 'community', reportedName: 'TROPICAL RP', reportedKind: 'community' },
  ],
};

async function mockReport(page: Page, people: unknown) {
  await page.route(`**/admin/api/reports/${REPORT_ID}`, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ report: REPORT, offenses: [], otherReports: [], reporterStats: { filed: 1 }, people }),
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

test.describe('Admin report page — who\'s who', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeAll(async () => { await seedReportReviewer(); });
  test.afterAll(async () => { await removeReportReviewer(); });

  test('shows both people, their communities and the look-alike names', async ({ page }) => {
    await login(page);
    await mockReport(page, PEOPLE);
    await page.goto(`/admin/report/${REPORT_ID}`);

    const card = page.locator('.card', { hasText: "Who's who" });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Names that look alike');
    await expect(card.locator('.notice')).toContainText('TROPICAL-RP');
    await expect(card).toContainText('The reporter is a member of the reported user\'s community');
    await expect(card.locator('.person').first()).toContainText('1k-01 | government');
    await expect(card.locator('.person').first()).toContainText('28 members');
    await expect(card.locator('.person').nth(1)).toContainText('Tropical-Piton11');
    await expect(card.locator('.name-hit')).not.toHaveCount(0);
  });

  test('no card when the API sends no people (stale API deploy)', async ({ page }) => {
    await login(page);
    await mockReport(page, undefined);
    await page.goto(`/admin/report/${REPORT_ID}`);

    await expect(page.locator('h1')).toHaveText('Impersonation');
    await expect(page.locator('.card', { hasText: "Who's who" })).toHaveCount(0);
  });
});
