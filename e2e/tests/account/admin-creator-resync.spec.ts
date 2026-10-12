/**
 * Admin console, Content Creators panel: what an admin can see and do about a
 * creator's linked platforms.
 *
 * The facts shown here come off the CREATOR record, not the application: the
 * application's platforms are a snapshot of what was claimed, and the creator
 * copy is the authoritative one from approval onwards. So the panel joins the
 * admin creators list onto the approved rows, and this spec pins that join
 * down along with the two things that are expensive to get wrong -- a
 * below-minimum flag reading as a punishment, and the manual verify that the
 * creator-facing copy promises.
 *
 * Both the Go API list and the verify endpoint are mocked with page.route: this
 * spec exercises the panel, not the API.
 *
 * Logged in as a non-owner `admin` on a dedicated admin_users row, so it can
 * run on a parallel worker alongside the transfers spec on the same panel.
 */
import { test, expect, Page, Route } from '@playwright/test';
import {
  seedConsoleCreatorSyncStaff,
  removeConsoleCreatorSyncStaff,
  TEST_CONSOLE_CC_SYNC_STAFF_EMAIL,
  TEST_CONSOLE_CC_SYNC_STAFF_PASSWORD,
} from '../../helpers/admin-users';

test.use({ storageState: { cookies: [], origins: [] } });

const CREATOR_ID = 'd2d2d2d2d2d2d2d2d2d2d2d2';
const APPLICATION_ID = 'e2e2e2e2e2e2e2e2e2e2e2e2';

const APPROVED_APPLICATION = {
  _id: APPLICATION_ID,
  displayName: 'Nightshift Gaming',
  status: 'approved',
  createdAt: '2026-02-11T09:00:00Z',
  primaryPlatform: 'tiktok',
  description: 'I run a long-running GTA roleplay server and stream the dispatch side of it.',
  platforms: [{ type: 'tiktok', handle: 'nightshift', followerCount: 8100 }],
  creatorId: CREATOR_ID,
  creatorStatus: 'active',
  checksPassed: true,
};

interface CreatorFixture {
  lastSyncedAt?: string;
  followerReviewFlaggedAt?: string;
  followerReviewReason?: string;
  platforms?: Array<Record<string, unknown>>;
}

function creatorRecord(fields: CreatorFixture = {}) {
  return {
    _id: CREATOR_ID,
    displayName: 'Nightshift Gaming',
    status: 'active',
    lastSyncedAt: fields.lastSyncedAt || '2026-10-11T09:00:00Z',
    followerReviewFlaggedAt: fields.followerReviewFlaggedAt,
    followerReviewReason: fields.followerReviewReason,
    platforms:
      fields.platforms || [
        {
          type: 'tiktok',
          handle: 'nightshift',
          followerCount: 9100,
          lastSyncedAt: '2026-10-11T09:00:00Z',
          verificationMethod: 'api',
        },
      ],
  };
}

interface ConsoleMocks {
  creators?: Array<Record<string, unknown>>;
  creatorsStatus?: number;
  creatorsBody?: unknown;
  verifyStatus?: number;
  verifyBody?: unknown;
  onVerify?: (path: string) => void;
}

async function mockConsole(page: Page, mocks: ConsoleMocks = {}) {
  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route(
    (url) => url.pathname === '/api/v1/admin/content-creator-applications',
    (route: Route) => {
      const url = new URL(route.request().url());
      // The filter chips ask for one row each, purely for the totals.
      if (url.searchParams.get('limit') === '1') {
        return json(route, 200, {
          success: true,
          applications: [],
          pagination: { totalItems: 0, totalPages: 0 },
        });
      }
      return json(route, 200, {
        success: true,
        applications: [APPROVED_APPLICATION],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1, hasNextPage: false, hasPrevPage: false },
      });
    }
  );

  // Serves both the "active in the creator program" count (limit=1) and the
  // creator index the approved rows are joined against (limit=100).
  await page.route(
    (url) => url.pathname === '/api/v1/admin/content-creators',
    (route: Route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('limit') === '1') {
        return json(route, 200, { success: true, creators: [], pagination: { totalItems: 4, totalPages: 1 } });
      }
      if (mocks.creatorsStatus) {
        return json(route, mocks.creatorsStatus, mocks.creatorsBody ?? { message: 'index is down' });
      }
      return json(route, 200, {
        success: true,
        creators: mocks.creators || [creatorRecord()],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1, hasNextPage: false, hasPrevPage: false },
      });
    }
  );

  await page.route(
    (url) => /^\/api\/v1\/admin\/content-creators\/[^/]+\/platforms\/\d+\/verify$/.test(url.pathname),
    (route: Route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      if (mocks.onVerify) mocks.onVerify(new URL(route.request().url()).pathname);
      return json(route, mocks.verifyStatus || 200, mocks.verifyBody ?? { success: true });
    }
  );
}

async function openCreatorsPanel(page: Page) {
  await page.goto('/admin');
  await page.locator('input[name="email"]').fill(TEST_CONSOLE_CC_SYNC_STAFF_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_CONSOLE_CC_SYNC_STAFF_PASSWORD);
  await Promise.all([
    page.waitForURL('**/admin/console**', { timeout: 15_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
  const tab = page.locator('[data-panel="content-creators"]').first();
  await expect(tab).toBeVisible({ timeout: 15_000 });
  await tab.click();
  await expect(page.locator('#ccApplicationResults')).toContainText('Nightshift Gaming', {
    timeout: 15_000,
  });
}

test.describe('Admin console — creator platform sync', { tag: '@admin' }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await seedConsoleCreatorSyncStaff();
  });

  test.afterAll(async () => {
    await removeConsoleCreatorSyncStaff();
  });

  test('joins the creator record on: last synced, and the real per-platform numbers', async ({ page }) => {
    await mockConsole(page);
    await openCreatorsPanel(page);

    await expect(page.locator(`[data-cc-sync="${CREATOR_ID}"]`)).toContainText('Last synced');

    // The creator's 9,100 rather than the application's claimed 8,100.
    const platforms = page.locator(`[data-cc-platforms="${CREATOR_ID}"]`);
    await expect(platforms).toContainText('TikTok');
    await expect(platforms).toContainText('@nightshift');
    await expect(platforms).toContainText('9,100 followers');
    await expect(platforms).toContainText('verified via api');
  });

  test('a below-minimum flag reads as a review, and says nothing was revoked', async ({ page }) => {
    await mockConsole(page, {
      creators: [
        creatorRecord({
          followerReviewFlaggedAt: '2026-10-11T10:00:00Z',
          followerReviewReason: 'TikTok came back with 310 followers.',
        }),
      ],
    });
    await openCreatorsPanel(page);

    const pill = page.locator(`[data-cc-flag="${CREATOR_ID}"]`);
    await expect(pill).toContainText('Needs follower review');
    await expect(pill.locator('span')).toHaveAttribute(
      'title',
      'TikTok came back with 310 followers. Nothing was revoked.'
    );
  });

  test('no flag means no pill, rather than a reassuring one', async ({ page }) => {
    await mockConsole(page);
    await openCreatorsPanel(page);

    await expect(page.locator(`[data-cc-platforms="${CREATOR_ID}"]`)).toContainText('TikTok');
    await expect(page.locator(`[data-cc-flag="${CREATOR_ID}"]`)).toBeEmpty();
  });

  test('a pending handle change offers the manual verify and posts the platform index', async ({ page }) => {
    const verified: string[] = [];
    await mockConsole(page, {
      onVerify: (path) => verified.push(path),
      creators: [
        creatorRecord({
          platforms: [
            {
              type: 'tiktok',
              handle: 'nightshift',
              followerCount: 9100,
              lastSyncedAt: '2026-10-11T09:00:00Z',
              pendingHandle: 'nightshiftrp',
            },
          ],
        }),
      ],
    });
    await openCreatorsPanel(page);

    const platforms = page.locator(`[data-cc-platforms="${CREATOR_ID}"]`);
    await expect(platforms).toContainText('Handle change pending: @nightshiftrp');

    await platforms.getByRole('button', { name: /Verify/ }).click();
    const modal = page.locator('#ccVerifyHandleModal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#ccVerifyCreatorName')).toHaveText('Nightshift Gaming');
    await expect(modal.locator('#ccVerifyHandleLine')).toHaveText('New handle: @nightshiftrp');

    await modal.locator('#ccConfirmVerifyHandleBtn').click();
    await expect(page.locator('#ccVerifyHandleModal')).toBeHidden();
    expect(verified).toEqual([`/api/v1/admin/content-creators/${CREATOR_ID}/platforms/0/verify`]);
  });

  test('a refused verify stays in the dialog with the reason the API gave', async ({ page }) => {
    await mockConsole(page, {
      verifyStatus: 409,
      verifyBody: { response: { message: 'That platform has no pending handle change.' } },
      creators: [
        creatorRecord({
          platforms: [
            {
              type: 'tiktok',
              handle: 'nightshift',
              followerCount: 9100,
              pendingHandle: 'nightshiftrp',
            },
          ],
        }),
      ],
    });
    await openCreatorsPanel(page);

    await page
      .locator(`[data-cc-platforms="${CREATOR_ID}"]`)
      .getByRole('button', { name: /Verify/ })
      .click();
    await page.locator('#ccConfirmVerifyHandleBtn').click();

    const modal = page.locator('#ccVerifyHandleModal');
    await expect(modal).toBeVisible();
    // jQuery 1.9 has no responseJSON, so this proves the responseText path.
    await expect(modal.locator('#ccVerifyError')).toContainText(
      'That platform has no pending handle change.'
    );
  });

  test('an unreachable creator index says so rather than printing "never synced"', async ({ page }) => {
    await mockConsole(page, {
      creatorsStatus: 502,
      creatorsBody: { response: { message: 'creator index is unavailable' } },
    });
    await openCreatorsPanel(page);

    await expect(page.locator(`[data-cc-sync="${CREATOR_ID}"]`)).toContainText(
      'Sync details unavailable: creator index is unavailable'
    );
    await expect(page.locator(`[data-cc-sync="${CREATOR_ID}"]`)).not.toContainText('never');
  });
});
