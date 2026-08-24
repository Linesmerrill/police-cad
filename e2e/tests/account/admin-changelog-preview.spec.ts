/**
 * The What's New authoring panel's preview-before-publish flow.
 *
 * A changelog post cannot be un-shown: seen-state is per user, so a broken
 * layout or a typo is permanent for everyone who opened the modal before it was
 * fixed. Preview renders the draft through the shipped modal
 * (window.whatsNewPreview, exported by whats-new.js) rather than a lookalike, so
 * what an owner approves is the same DOM and stylesheet users get.
 */
import { test, expect, Page } from '@playwright/test';
import {
  seedConsoleOwner,
  removeConsoleOwner,
  TEST_CONSOLE_OWNER_EMAIL,
  TEST_CONSOLE_OWNER_PASSWORD,
} from '../../helpers/admin-users';

// The panel is owner-only, so this suite logs in as its own owner rather than
// reusing the shared authenticated state.
test.use({ storageState: { cookies: [], origins: [] } });

const DRAFT_TITLE = 'Joining a community, made clear';
const DRAFT_BODY =
  '<p>Two changes:</p><ul><li><i class="fab fa-discord"></i><span>Owners can add a <b>Discord invite</b>.</span></li></ul>';

async function loginAsOwner(page: Page) {
  await page.goto('/admin');
  await page.locator('input[name="email"]').fill(TEST_CONSOLE_OWNER_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_CONSOLE_OWNER_PASSWORD);
  await Promise.all([
    page.waitForURL('**/admin/console**', { timeout: 15_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
}

async function openChangelogPanel(page: Page) {
  await loginAsOwner(page);
  await page.locator('#changelog-tab').click();
  await expect(page.locator('#changelogTitle')).toBeVisible();
}

async function fillDraft(page: Page) {
  await page.locator('#changelogTitle').fill(DRAFT_TITLE);
  await page.locator('#changelogBody').fill(DRAFT_BODY);
}

test.describe("Admin console — What's New preview", { tag: '@auth' }, () => {
  test.beforeAll(async () => {
    await seedConsoleOwner();
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
});
