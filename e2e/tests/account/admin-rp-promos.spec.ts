import { test, expect, Page } from '@playwright/test';
import {
  seedConsoleOwner,
  removeConsoleOwner,
  TEST_CONSOLE_OWNER_EMAIL,
  TEST_CONSOLE_OWNER_PASSWORD,
} from '../../helpers/admin-users';

// The Server Promos panel is owner-only (revealed only when the admin's roles
// include "owner"), so we seed an owner console admin and log in as them.
// API endpoints are mocked with page.route — the test exercises the panel UI
// (duplicate flags, ban dialog with computed penalty + email preview), not the
// Go API.
test.use({ storageState: { cookies: [], origins: [] } });

async function loginAsConsoleOwner(page: Page) {
  await page.goto('/admin');
  await page.locator('input[name="email"]').fill(TEST_CONSOLE_OWNER_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_CONSOLE_OWNER_PASSWORD);
  await Promise.all([
    page.waitForURL('**/admin/console**', { timeout: 15_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
}

const OWNER_ID = '6a235c11f1989cdf6a483c3b';

// Two near-duplicate promos by the same owner — the exact shape that motivated
// this feature (one owner, two communities, same server name + invite reused).
const PROMOS = [
  {
    communityId: 'c1', communityName: 'Vice City Rejects', ownerId: OWNER_ID, ownerName: 'rhiley03',
    postId: 'p1', postedBy: OWNER_ID, postedByName: 'rhiley03', postedAt: '2026-06-06T13:57:38Z',
    tier: 'free', serverName: 'Vice City Rejects', game: 'GTA RP', consoles: ['Xbox'],
    inviteUrl: 'https://discord.gg/kHh96mwUf', messageId: 'm1', messageLink: '', removed: false,
    ownerDup: true, nameDup: true, inviteDup: false, ownerBanned: false,
  },
  {
    communityId: 'c2', communityName: 'ViceCity Rejects', ownerId: OWNER_ID, ownerName: 'rhiley03',
    postId: 'p2', postedBy: OWNER_ID, postedByName: 'rhiley03', postedAt: '2026-06-06T14:03:06Z',
    tier: 'free', serverName: 'ViceCity Rejects', game: 'GTA RP', consoles: ['Xbox'],
    inviteUrl: 'https://discord.gg/dzDt8bAUD', messageId: 'm2', messageLink: '', removed: false,
    ownerDup: true, nameDup: true, inviteDup: false, ownerBanned: false,
  },
];

test.describe('Admin → Server Promos panel', { tag: '@admin' }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await seedConsoleOwner();
  });

  test.afterAll(async () => {
    await removeConsoleOwner();
  });

  test.beforeEach(async ({ page }) => {
    await loginAsConsoleOwner(page);
  });

  test('lists promos with possible-duplicate flags', async ({ page }) => {
    await page.route('**/api/v1/admin/rp-promos', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: PROMOS, totalCount: PROMOS.length, page: 1, limit: 25 }),
      });
    });

    await page.goto('/admin/console#rp-promos');

    const results = page.locator('#rpPromosResults');
    await expect(results).toContainText('Vice City Rejects');
    await expect(results).toContainText('ViceCity Rejects');
    await expect(results).toContainText('rhiley03');
    // Advisory duplicate badges are rendered.
    await expect(results.locator('.rp-badge-warn').first()).toBeVisible();
    await expect(results).toContainText('Owner dup');
    await expect(results).toContainText('Name dup');
  });

  test('ban dialog shows computed penalty + email preview', async ({ page }) => {
    await page.route('**/api/v1/admin/rp-promos', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: PROMOS, totalCount: PROMOS.length, page: 1, limit: 25 }),
      });
    });
    await page.route('**/api/v1/admin/rp-promos/ban/preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          offenseNumber: 1,
          penaltyLabel: '7-day',
          expiresAt: '2026-06-13T14:03:06Z',
          recipientEmail: 'rhiley03@example.com',
          username: 'rhiley03',
          emailText: 'Hello rhiley03,\n\nOffense #1. Your ability to post server promotions has been restricted for 7-day.',
          emailHtml: '<p>preview</p>',
        }),
      });
    });

    await page.goto('/admin/console#rp-promos');
    await expect(page.locator('#rpPromosResults')).toContainText('rhiley03');

    // Open the ban dialog for the owner.
    await page.locator('.rp-ban-btn').first().click();

    const modal = page.locator('#rpBanModal');
    await expect(modal).toBeVisible();
    await expect(page.locator('#rpBanPenalty')).toContainText('Offense #1');
    await expect(page.locator('#rpBanPenalty')).toContainText('7-day');
    await expect(page.locator('#rpBanRecipient')).toContainText('rhiley03@example.com');
    await expect(page.locator('#rpBanEmailPreview')).toContainText('Offense #1');
    // Evidence rows are pre-populated from the owner's loaded promos.
    await expect(page.locator('#rpBanEvidence .rp-evidence-check')).toHaveCount(2);
  });
});
