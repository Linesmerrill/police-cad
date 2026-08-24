/**
 * The What's New authoring panel's preview-before-publish flow.
 *
 * A changelog post cannot be un-shown: seen-state is per user, so a broken
 * layout or a typo is permanent for everyone who opened the modal before it was
 * fixed. Preview renders the draft through the shipped modal
 * (window.whatsNewPreview, exported by whats-new.js) rather than a lookalike, so
 * what an owner approves is the same DOM and stylesheet users get.
 */
import path from 'path';
import { test, expect, Page } from '@playwright/test';
import {
  seedConsoleOwner,
  removeConsoleOwner,
  TEST_CONSOLE_OWNER_EMAIL,
  TEST_CONSOLE_OWNER_PASSWORD,
} from '../../helpers/admin-users';

// The panel is owner-only, so this suite signs in as its own owner rather than
// reusing the shared authenticated state. It signs in ONCE in beforeAll and
// every test reuses that session: logging in per test meant thirteen logins,
// which under parallel CI load flaked against the 30s per-test budget.
const OWNER_STATE = path.join(__dirname, '../../.auth/console-owner.json');

const DRAFT_TITLE = 'Joining a community, made clear';
const DRAFT_BODY =
  '<p>Two changes:</p><ul><li><i class="fab fa-discord"></i><span>Owners can add a <b>Discord invite</b>.</span></li></ul>';

async function loginAsOwner(page: Page) {
  await page.goto('/admin');
  await page.locator('input[name="email"]').fill(TEST_CONSOLE_OWNER_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_CONSOLE_OWNER_PASSWORD);
  // 30s rather than the 15s the other console specs use: this file logs in for
  // each of its thirteen tests, and under parallel load that was enough to make
  // the login itself flake.
  await Promise.all([
    page.waitForURL('**/admin/console**', { timeout: 15_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
}

// The session comes from OWNER_STATE, so this is just a navigation.
async function openChangelogPanel(page: Page) {
  await page.goto('/admin/console');
  await page.locator('#changelog-tab').click();
  await expect(page.locator('#changelogTitle')).toBeVisible();
}

async function fillDraft(page: Page) {
  await page.locator('#changelogTitle').fill(DRAFT_TITLE);
  await page.locator('#changelogBody').fill(DRAFT_BODY);
}

// Posts the audience simulation is evaluated against. Deliberately mixed:
// an inactive post, a mobile-only post and an all-surfaces post, so the filters
// are actually exercised rather than every post counting.
const SEEDED_POSTS = [
  { _id: 'p1', title: 'Web one', body: '<p>1</p>', active: true, surfaces: ['web'], publishedAt: '2026-07-01T00:00:00Z' },
  { _id: 'p2', title: 'Web two', body: '<p>2</p>', active: true, surfaces: ['web'], publishedAt: '2026-07-05T00:00:00Z' },
  { _id: 'p3', title: 'Everyone', body: '<p>3</p>', active: true, surfaces: [], publishedAt: '2026-07-03T00:00:00Z' },
  { _id: 'p4', title: 'Mobile only', body: '<p>4</p>', active: true, surfaces: ['mobile'], publishedAt: '2026-07-04T00:00:00Z' },
  { _id: 'p5', title: 'Switched off', body: '<p>5</p>', active: false, surfaces: ['web'], publishedAt: '2026-07-06T00:00:00Z' },
];

async function mockChangelogList(page: Page, posts = SEEDED_POSTS) {
  await page.route('**/api/v1/admin/changelog', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: posts }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' });
  });
}

function audienceBtn(page: Page, key: string) {
  return page.locator('#changelogAudienceBtns button[data-audience="' + key + '"]');
}

test.describe("Admin console — What's New preview", { tag: '@auth' }, () => {
  test.use({ storageState: OWNER_STATE });

  test.beforeAll(async ({ browser }) => {
    await seedConsoleOwner();
    // One sign-in for the whole file; every test then starts already
    // authenticated as the owner.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await loginAsOwner(page);
    await context.storageState({ path: OWNER_STATE });
    await context.close();
  });

  test.afterAll(async () => {
    await removeConsoleOwner();
  });

  test('preview renders the draft through the real modal', async ({ page }) => {
    await openChangelogPanel(page);
    await fillDraft(page);
    await page.locator('#changelogPreviewBtn').click();

    // The shipped modal, not a lookalike.
    await expect(page.locator('.wn-overlay .wn-card')).toBeVisible();
    await expect(page.locator('.wn-title')).toHaveText(DRAFT_TITLE);
    // Body must render as HTML, which is the whole point of previewing it.
    await expect(page.locator('.wn-body b')).toHaveText('Discord invite');
    await expect(page.locator('.wn-body i.fab')).toBeVisible();
  });

  test('preview-only offers no publish button', async ({ page }) => {
    await openChangelogPanel(page);
    await fillDraft(page);
    await page.locator('#changelogPreviewBtn').click();

    await expect(page.locator('.wn-card')).toBeVisible();
    await expect(page.locator('.wn-adminbar')).toHaveCount(0);
  });

  test('preview and publish offers publish, outside the previewed card', async ({ page }) => {
    await openChangelogPanel(page);
    await fillDraft(page);
    await page.locator('#changelogPublishBtn').click();

    const bar = page.locator('.wn-adminbar');
    await expect(bar).toBeVisible();
    await expect(bar.locator('.wn-adminbar-go')).toContainText(/publish/i);
    // The action bar must never sit inside the card, or the preview would be
    // showing chrome that does not ship.
    await expect(page.locator('.wn-card .wn-adminbar')).toHaveCount(0);
  });

  test('keeping editing does not publish', async ({ page }) => {
    await openChangelogPanel(page);
    await fillDraft(page);

    let posted = 0;
    await page.route('**/api/v1/admin/changelog', async (route) => {
      if (route.request().method() === 'POST') posted++;
      await route.fulfill({ status: 200, body: '{}' });
    });

    await page.locator('#changelogPublishBtn').click();
    await page.locator('.wn-adminbar-ghost').click();

    await expect(page.locator('.wn-overlay')).toHaveCount(0);
    // The draft survives so the owner can fix and retry.
    await expect(page.locator('#changelogTitle')).toHaveValue(DRAFT_TITLE);
    expect(posted).toBe(0);
  });

  test('publishing from the preview posts the previewed draft', async ({ page }) => {
    await openChangelogPanel(page);
    await fillDraft(page);

    const bodies: string[] = [];
    await page.route('**/api/v1/admin/changelog', async (route) => {
      if (route.request().method() === 'POST') bodies.push(route.request().postData() || '');
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' });
    });

    await page.locator('#changelogPublishBtn').click();
    await page.locator('.wn-adminbar-go').click();

    await expect(page.locator('.wn-overlay')).toHaveCount(0);
    await expect.poll(() => bodies.length).toBe(1);

    // What was posted must be what was previewed, or the preview proves nothing.
    const payload = JSON.parse(bodies[0]);
    expect(payload.title).toBe(DRAFT_TITLE);
    expect(payload.body).toBe(DRAFT_BODY);
  });

  test('an incomplete draft is refused before any preview opens', async ({ page }) => {
    await openChangelogPanel(page);
    await page.locator('#changelogTitle').fill('Title only, no body');

    await page.locator('#changelogPublishBtn').click();

    await expect(page.locator('#changelogFormError')).toBeVisible();
    await expect(page.locator('.wn-overlay')).toHaveCount(0);
  });

  test.describe('audience preview', () => {
    test('an existing user sees every active post for the surface', async ({ page }) => {
      await mockChangelogList(page);
      await openChangelogPanel(page);

      // web + all-surfaces, excluding the mobile-only and the inactive one.
      await expect(audienceBtn(page, 'existing')).toContainText('(3)');
    });

    test('a brand-new user sees nothing, and is told why', async ({ page }) => {
      await mockChangelogList(page);
      await openChangelogPanel(page);

      await expect(audienceBtn(page, 'new')).toContainText('(0)');
      await audienceBtn(page, 'new').click();

      await expect(page.locator('.wn-overlay')).toHaveCount(0);
      await expect(page.locator('#changelogFormError')).toContainText(/nothing would be shown/i);
    });

    test('the draft counts toward existing and caught-up, never new', async ({ page }) => {
      await mockChangelogList(page);
      await openChangelogPanel(page);

      await expect(audienceBtn(page, 'caught-up')).toContainText('(0)');
      await fillDraft(page);

      await expect(audienceBtn(page, 'existing')).toContainText('(4)');
      await expect(audienceBtn(page, 'caught-up')).toContainText('(1)');
      // A new account postdates the draft, so it still reaches nobody.
      await expect(audienceBtn(page, 'new')).toContainText('(0)');
    });

    test('unchecking Website recounts for mobile', async ({ page }) => {
      await mockChangelogList(page);
      await openChangelogPanel(page);

      await page.locator('#changelogSurfaceWeb').uncheck();
      // mobile-only + all-surfaces
      await expect(audienceBtn(page, 'existing')).toContainText('(2)');
    });

    test('an existing user replays the whole queue, newest first', async ({ page }) => {
      await mockChangelogList(page);
      await openChangelogPanel(page);

      await audienceBtn(page, 'existing').click();
      await expect(page.locator('.wn-card')).toBeVisible();

      // Sorted by publishedAt desc: Web two (7/5), Everyone (7/3), Web one (7/1).
      await expect(page.locator('.wn-title')).toHaveText('Web two');
      await expect(page.locator('.wn-dots span')).toHaveCount(3);
      await expect(page.locator('.wn-btn')).toHaveText('Next');

      await page.locator('.wn-btn').click();
      await expect(page.locator('.wn-title')).toHaveText('Everyone');
      await page.locator('.wn-btn').click();
      await expect(page.locator('.wn-title')).toHaveText('Web one');
      await expect(page.locator('.wn-btn')).toHaveText('Got it');
    });

    test('a large backlog is flagged before it ships', async ({ page }) => {
      const many = Array.from({ length: 6 }, (_, i) => ({
        _id: 'm' + i, title: 'Post ' + i, body: '<p>x</p>',
        active: true, surfaces: ['web'], publishedAt: '2026-07-0' + (i + 1) + 'T00:00:00Z',
      }));
      await mockChangelogList(page, many);
      await openChangelogPanel(page);

      await expect(audienceBtn(page, 'existing')).toContainText('(6)');
      await expect(page.locator('#changelogAudienceNote')).toContainText(/in a row is a lot/i);
    });

    test('previewing an audience never publishes', async ({ page }) => {
      let posted = 0;
      await page.route('**/api/v1/admin/changelog', async (route) => {
        if (route.request().method() === 'POST') { posted++; await route.fulfill({ status: 200, body: '{}' }); return; }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: SEEDED_POSTS }) });
      });
      await openChangelogPanel(page);
      await fillDraft(page);

      // Wait for the count to reflect the draft before clicking, so this cannot
      // race the re-render that runs on every keystroke.
      await expect(audienceBtn(page, 'existing')).toContainText('(4)');
      await audienceBtn(page, 'existing').click();
      await expect(page.locator('.wn-card')).toBeVisible();
      // No publish affordance on an audience preview — it is a rehearsal.
      await expect(page.locator('.wn-adminbar')).toHaveCount(0);
      expect(posted).toBe(0);
    });
  });
});
