/**
 * Creator dashboard: keeping a linked platform current (/content-creators/me).
 *
 * Two things an approved creator can do per platform, both of which read the
 * public channel rather than trusting a typed-in number:
 *   - Resync followers: re-read the count we hold.
 *   - Change handle: prove a renamed channel with an LPC-VERIFY code, while the
 *     old handle keeps working until the code is found.
 *
 * The outcomes worth pinning down are the unhappy ones, because they are where
 * honest copy matters: a platform that blocks us must say nothing was changed,
 * a count under the minimum must not read as a revocation, and a failed code
 * check must leave the live handle alone.
 *
 * Every API route is mocked at the website proxy level (/api/v1/...): the Go
 * endpoints are a parallel workstream and these specs must not depend on them
 * being deployed. See admin-finance.spec.ts for the same pattern.
 */
import { test, expect, Page, Route } from '@playwright/test';

const CREATOR_ID = 'c2c2c2c2c2c2c2c2c2c2c2c2';

interface PlatformFixture {
  type: string;
  url?: string;
  handle: string;
  followerCount: number;
  verificationStatus?: string;
  lastSyncedAt?: string;
  verificationCode?: string;
  pendingHandle?: string;
}

const TWITCH: PlatformFixture = {
  type: 'twitch',
  url: 'https://twitch.tv/nightshift',
  handle: 'nightshift',
  followerCount: 4200,
  verificationStatus: 'verified',
  lastSyncedAt: '2026-10-01T09:00:00Z',
};

const TIKTOK: PlatformFixture = {
  type: 'tiktok',
  url: 'https://tiktok.com/@nightshift',
  handle: 'nightshift',
  followerCount: 9100,
  verificationStatus: 'verified',
  lastSyncedAt: '2026-10-01T09:00:00Z',
};

interface CreatorFields {
  platforms: PlatformFixture[];
  followerReviewFlaggedAt?: string;
  followerReviewReason?: string;
  lastSyncedAt?: string;
}

function creatorFixture(fields: CreatorFields) {
  return {
    success: true,
    creator: {
      _id: CREATOR_ID,
      displayName: 'Nightshift Gaming',
      slug: 'nightshift-gaming',
      status: 'active',
      featured: false,
      joinedAt: '2026-01-04T00:00:00Z',
      bio: 'A creator profile seeded for the platform resync specs.',
      themeColor: '#fbbf24',
      primaryPlatform: 'twitch',
      platforms: fields.platforms,
      lastSyncedAt: fields.lastSyncedAt,
      followerReviewFlaggedAt: fields.followerReviewFlaggedAt,
      followerReviewReason: fields.followerReviewReason,
      entitlements: {
        personalPlan: true,
        communityPlan: { active: false },
      },
    },
  };
}

interface Reply {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

interface Mocks {
  fields: CreatorFields;
  resync?: Reply;
  reverifyStart?: Reply;
  reverifyCheck?: Reply;
  sync?: Reply;
  onPost?: (path: string, body: unknown) => void;
}

async function mockDashboard(page: Page, mocks: Mocks) {
  const json = (route: Route, reply: Reply, fallbackBody: unknown) =>
    route.fulfill({
      status: reply.status || 200,
      contentType: 'application/json',
      headers: reply.headers,
      body: JSON.stringify(reply.body !== undefined ? reply.body : fallbackBody),
    });

  // One dispatching handler: these paths share a prefix, and separate
  // page.route calls would fight over last-registered-wins.
  await page.route('**/api/v1/content-creator**', (route: Route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const method = req.method();

    if (method === 'GET' && path === '/api/v1/content-creator-applications/me') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(creatorFixture(mocks.fields)),
      });
    }

    if (method === 'POST') {
      const body = req.postData() ? req.postDataJSON() : {};
      if (mocks.onPost) mocks.onPost(path, body);

      if (path === '/api/v1/content-creators/me/sync') {
        return json(route, mocks.sync || {}, {
          success: true,
          message: 'Follower counts updated.',
          platforms: mocks.fields.platforms,
          lastSyncedAt: new Date().toISOString(),
        });
      }
      const match = path.match(
        /^\/api\/v1\/content-creators\/me\/platforms\/(\d+)\/(resync|reverify-start|reverify-check)$/
      );
      if (match) {
        const action = match[2];
        if (action === 'resync') {
          return json(route, mocks.resync || {}, { success: true });
        }
        if (action === 'reverify-start') {
          return json(route, mocks.reverifyStart || {}, {});
        }
        return json(route, mocks.reverifyCheck || {}, {});
      }
    }

    return route.fallback();
  });
}

async function openDashboard(page: Page) {
  await page.goto('/content-creators/me');
  await expect(page.getByTestId('platform-row-0')).toBeVisible({ timeout: 15_000 });
}

test.describe('Creator dashboard — platform resync and handle change', { tag: '@auth' }, () => {
  test('resync replaces the count on the row without a reload', async ({ page }) => {
    const posted: string[] = [];
    await mockDashboard(page, {
      fields: { platforms: [TWITCH] },
      onPost: (path) => posted.push(path),
      resync: {
        body: {
          success: true,
          platform: {
            type: 'twitch',
            handle: 'nightshift',
            followerCount: 5300,
            lastSyncedAt: new Date().toISOString(),
          },
          previousFollowerCount: 4200,
          belowMinimum: false,
          message: 'Read from Twitch. You have 5,300 followers.',
        },
      },
    });
    await openDashboard(page);

    await expect(page.getByTestId('platform-followers-0')).toHaveText('4,200 followers');
    await page.getByTestId('platform-resync-0').click();

    await expect(page.getByTestId('platform-followers-0')).toHaveText('5,300 followers');
    await expect(page.getByTestId('platform-note-0')).toContainText(
      'Read from Twitch. You have 5,300 followers.'
    );
    await expect(page.getByTestId('platform-last-synced-0')).toContainText('just now');
    expect(posted).toEqual(['/api/v1/content-creators/me/platforms/0/resync']);
  });

  test('a platform that blocks us says so, names the way out and changes nothing', async ({ page }) => {
    await mockDashboard(page, {
      fields: { platforms: [TIKTOK] },
      resync: {
        status: 503,
        body: {
          response: {
            message:
              'TikTok would not let us read that channel just now. Nothing was changed, try again later.',
          },
        },
      },
    });
    await openDashboard(page);

    await page.getByTestId('platform-resync-0').click();

    const note = page.getByTestId('platform-note-0');
    await expect(note).toContainText('Nothing was changed, try again later.');
    await expect(note).toContainText('An admin can verify it manually.');
    // Nothing was changed means nothing was changed, on screen too.
    await expect(page.getByTestId('platform-followers-0')).toHaveText('9,100 followers');
    await expect(note).not.toContainText('revoked');
  });

  test('a count under the minimum says an admin will look, not that anything was lost', async ({ page }) => {
    await mockDashboard(page, {
      fields: { platforms: [TWITCH] },
      resync: {
        body: {
          success: true,
          platform: {
            type: 'twitch',
            handle: 'nightshift',
            followerCount: 310,
            lastSyncedAt: new Date().toISOString(),
          },
          previousFollowerCount: 4200,
          belowMinimum: true,
          message:
            '310 followers is below the 500 minimum. An admin will review it. Nothing on your profile has changed.',
        },
      },
    });
    await openDashboard(page);

    await page.getByTestId('platform-resync-0').click();

    const note = page.getByTestId('platform-note-0');
    await expect(note).toContainText('An admin will review it');
    await expect(note).toContainText('Nothing on your profile has changed');
    await expect(note).not.toContainText('revoked');
    await expect(note).not.toContainText('grace period');
    await expect(page.getByTestId('platform-followers-0')).toHaveText('310 followers');
  });

  test('an exhausted check budget reports the wait the API gave', async ({ page }) => {
    await mockDashboard(page, {
      fields: { platforms: [TWITCH] },
      resync: {
        status: 429,
        headers: { 'Retry-After': '31' },
        body: { response: { message: 'Please wait 31 seconds before checking again.' } },
      },
    });
    await openDashboard(page);

    await page.getByTestId('platform-resync-0').click();

    await expect(page.getByTestId('platform-note-0')).toContainText(
      'Please wait 31 seconds before checking again.'
    );
    await expect(page.getByTestId('platform-followers-0')).toHaveText('4,200 followers');
  });

  test('change handle: the code comes with the promise that the old handle still works', async ({ page }) => {
    const bodies: Array<{ path: string; body: unknown }> = [];
    await mockDashboard(page, {
      fields: { platforms: [TIKTOK] },
      onPost: (path, body) => bodies.push({ path, body }),
      reverifyStart: {
        body: {
          code: 'LPC-VERIFY-AB12CD',
          platform: 'tiktok',
          handle: 'nightshiftrp',
          instruction: 'Add this code anywhere in your TikTok bio and leave it there while we check.',
        },
      },
    });
    await openDashboard(page);

    await page.getByTestId('platform-change-handle-0').click();
    await page.getByTestId('handle-input-0').fill('nightshiftrp');
    await page.getByTestId('handle-start-0').click();

    await expect(page.getByTestId('handle-code-0')).toHaveText('LPC-VERIFY-AB12CD');
    await expect(page.getByTestId('handle-instruction-0')).toContainText(
      'Add this code anywhere in your TikTok bio'
    );
    await expect(page.getByTestId('handle-pending-0')).toContainText('Waiting on nightshiftrp');
    await expect(page.getByTestId('handle-pending-0')).toContainText('keeps working');
    // The live handle is untouched until the code is found.
    await expect(page.getByTestId('platform-handle-0')).toHaveText('@nightshift');
    expect(bodies).toEqual([
      {
        path: '/api/v1/content-creators/me/platforms/0/reverify-start',
        body: { handle: 'nightshiftrp' },
      },
    ]);
  });

  test('change handle: a code we cannot find leaves the live handle alone', async ({ page }) => {
    await mockDashboard(page, {
      fields: {
        platforms: [{ ...TIKTOK, pendingHandle: 'nightshiftrp', verificationCode: 'LPC-VERIFY-AB12CD' }],
      },
      reverifyCheck: {
        body: {
          verified: false,
          channelFound: true,
          codeFound: false,
          codeMessage: 'The code is not in that bio yet.',
        },
      },
    });
    await openDashboard(page);

    await page.getByTestId('handle-check-0').click();

    const note = page.getByTestId('platform-note-0');
    await expect(note).toContainText('The code is not in that bio yet.');
    await expect(note).toContainText('still nightshift');
    await expect(page.getByTestId('platform-handle-0')).toHaveText('@nightshift');
    await expect(page.getByTestId('handle-pending-0')).toContainText('Waiting on nightshiftrp');
  });

  test('change handle: a found code promotes the new handle on the spot', async ({ page }) => {
    await mockDashboard(page, {
      fields: {
        platforms: [{ ...TIKTOK, pendingHandle: 'nightshiftrp', verificationCode: 'LPC-VERIFY-AB12CD' }],
      },
      reverifyCheck: {
        body: {
          verified: true,
          codeFound: true,
          platform: {
            type: 'tiktok',
            handle: 'nightshiftrp',
            followerCount: 9400,
            lastSyncedAt: new Date().toISOString(),
          },
          belowMinimum: false,
        },
      },
    });
    await openDashboard(page);

    await page.getByTestId('handle-check-0').click();

    await expect(page.getByTestId('platform-handle-0')).toHaveText('@nightshiftrp');
    await expect(page.getByTestId('platform-followers-0')).toHaveText('9,400 followers');
    await expect(page.getByTestId('platform-note-0')).toContainText(
      'nightshiftrp is now your TikTok handle'
    );
    // Promoted means no longer pending.
    await expect(page.getByTestId('handle-pending-0')).toHaveCount(0);
  });

  test('a standing review flag is shown as a review, not a punishment', async ({ page }) => {
    await mockDashboard(page, {
      fields: {
        platforms: [TWITCH],
        followerReviewFlaggedAt: '2026-10-10T09:00:00Z',
        followerReviewReason: 'Twitch came back with 310 followers.',
      },
    });
    await openDashboard(page);

    const flag = page.getByTestId('follower-review-flag');
    await expect(flag).toContainText('Twitch came back with 310 followers.');
    await expect(flag).toContainText('An admin will review it');
    await expect(flag).not.toContainText('revoked');
  });

  test('Sync Followers no longer posts a count for a platform we can read', async ({ page }) => {
    const bodies: Array<{ path: string; body: unknown }> = [];
    await mockDashboard(page, {
      fields: { platforms: [TWITCH, { type: 'other', handle: 'nightshift', followerCount: 70 }] },
      onPost: (path, body) => bodies.push({ path, body }),
    });
    await openDashboard(page);

    await page.getByTestId('open-sync-modal').click();
    // Twitch is read for us, so there is nothing to type: only "other" keeps a box.
    await expect(page.getByTestId('sync-read-twitch')).toContainText('We read this from Twitch');
    await expect(page.getByTestId('sync-input-twitch')).toHaveCount(0);
    await page.getByTestId('sync-input-other').fill('95');

    await page.getByTestId('sync-submit').click();
    await expect(page.getByText('Follower counts updated.')).toBeVisible();

    expect(bodies).toEqual([
      {
        path: '/api/v1/content-creators/me/sync',
        body: { platforms: [{ type: 'other', followerCount: 95 }] },
      },
    ]);
  });
});
