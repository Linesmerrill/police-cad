import { test, expect, Page } from '@playwright/test';
import { TEST_COMMUNITY_ID, TEST_USER_ID } from '../../helpers/seed';
import {
  addPoliceDepartment,
  addTestCitation,
  createTestCivilian,
  deleteCivilianById,
  encodeIdForUrl,
  removeDepartmentById,
  uniqueCivName,
  unsetAllowCivilianRecordDeletion,
} from '../../helpers/db';
import { communityDetailsUrl } from '../../helpers/test-urls';

/**
 * Community setting "Allow civilians to delete their own records".
 *
 * Replaces the per-department "Restrict civilian record deletion" toggle,
 * which only ever showed on Civilian departments and so never took effect.
 * When the setting is off, the player who owns a character loses the delete
 * button on its records; officers and admins are unaffected.
 */
const COMMUNITY_HEX = TEST_COMMUNITY_ID.toHexString();
const COMMUNITY_GET = new RegExp(`/api/v1/community/${COMMUNITY_HEX}(\\?.*)?$`);

const API_URL = process.env.POLICE_CAD_API_URL || 'http://localhost:8081';

// The settings tests write the shared community's setting; keep this file's
// tests from interleaving with each other.
test.describe.configure({ mode: 'serial' });

test.describe('General Settings: record deletion toggle', { tag: '@auth' }, () => {
  test.afterAll(async () => {
    await unsetAllowCivilianRecordDeletion();
  });

  async function openCommunityPage(page: Page) {
    await page.goto(communityDetailsUrl());
    await expect(page).not.toHaveURL(/\/login/);
    const overview = await page
      .locator('#community-overview')
      .isVisible()
      .catch(() => false);
    if (!overview) test.skip(true, 'Community API not reachable');
  }

  test('only an admin can change it', async ({ page }) => {
    await openCommunityPage(page);
    // Sent from the page so it carries our Origin, like the real save does.
    const statusFor = (userId: string) =>
      page.evaluate(
        async ({ api, id, uid }) => {
          const res = await fetch(`${api}/api/v1/community/${id}?userId=${uid}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allowCivilianRecordDeletion: true }),
          });
          return res.status;
        },
        { api: API_URL, id: COMMUNITY_HEX, uid: userId }
      );
    // Someone with no role in the community.
    expect(await statusFor('0123456789abcdef01234567')).toBe(403);
    // The seeded test user owns the community.
    expect(await statusFor(TEST_USER_ID.toHexString())).toBe(200);
  });

  test('settings admin sees it on by default and turning it off PATCHes the community', async ({ page }) => {
    await unsetAllowCivilianRecordDeletion();
    await openCommunityPage(page);

    const card = page.locator('#generalSettingsCard');
    await expect(card).toHaveAttribute('onclick', /openGeneralSettingsModal/);
    await page.evaluate(() => (window as unknown as { openSettingsModal: () => void }).openSettingsModal());
    await card.click();

    const modal = page.locator('#generalSettingsModal');
    await expect(modal).toBeVisible();
    await expect(page.locator('#generalSettingsLoading')).toBeHidden({ timeout: 15_000 });

    const toggle = page.locator('#allowCivilianRecordDeletion');
    await expect(toggle).toBeVisible();
    await expect(toggle).toBeChecked();
    await expect(modal).toContainText('Allow civilians to delete their own records');
    await expect(modal).toContainText("When off, players can't remove citations, warnings or arrests from their own characters.");

    await toggle.uncheck();
    const patched = page.waitForResponse(
      (res) => res.request().method() === 'PATCH' && COMMUNITY_GET.test(res.url())
    );
    await modal.getByRole('button', { name: 'Save Settings' }).click();

    const res = await patched;
    expect(res.request().postDataJSON().allowCivilianRecordDeletion).toBe(false);
    expect(res.ok()).toBe(true);
  });
});

test.describe('Department dashboard: own-record delete button', { tag: '@auth' }, () => {
  let deptId: string;
  let civId: string;
  let civName: string;

  test.beforeEach(async () => {
    deptId = await addPoliceDepartment({ name: 'E2E RecDel PD' });
    civName = uniqueCivName('RecDel');
    civId = await createTestCivilian({ firstName: civName, lastName: 'Owner' });
    await addTestCitation(civId);
  });

  test.afterEach(async () => {
    await deleteCivilianById(civId);
    await removeDepartmentById(deptId);
  });

  /**
   * The test user owns the seeded community, which always bypasses the
   * setting. Serve the dashboard a copy of the community where someone else
   * owns it, so the viewer is just a player who owns this character.
   */
  async function serveCommunityAsPlayer(page: Page, allow: boolean | undefined) {
    await page.route(COMMUNITY_GET, async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      const res = await route.fetch();
      const json = await res.json();
      const comm = json.community || json;
      comm.ownerID = 'f0f0f0f0f0f0f0f0f0f0f0f0';
      comm.roles = [];
      if (allow === undefined) delete comm.allowCivilianRecordDeletion;
      else comm.allowCivilianRecordDeletion = allow;
      await route.fulfill({ response: res, json });
    });
  }

  async function openOwnCivilianRecords(page: Page) {
    const url =
      `/department-dashboard?dept=E2E%20RecDel%20PD&c=${encodeURIComponent(encodeIdForUrl(COMMUNITY_HEX))}` +
      `&d=${encodeURIComponent(encodeIdForUrl(deptId))}`;
    const community = page.waitForResponse((res) => COMMUNITY_GET.test(res.url()) && res.request().method() === 'GET');
    await page.goto(url);
    await expect(page).not.toHaveURL(/\/login/);

    const civNav = page.locator('#dd-nav-components .dd-nav-item[data-panel="createCivilians"]');
    const navReady = await civNav
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!navReady) {
      test.skip(true, 'Civilians panel nav not reachable, API may be offline');
      return;
    }
    await community;
    await civNav.click();

    // Search so the character is found whatever page of the grid it lands on.
    await page.locator('#dd-civ-search').fill(civName);
    const civCard = page.locator(`.dd-civ-card[data-civ-id="${civId}"]`);
    await expect(civCard).toBeVisible({ timeout: 15_000 });
    await civCard.click();

    const recordsTab = page.locator('.dd-civ-tab[data-tab="records"]');
    await expect(recordsTab).toBeVisible({ timeout: 10_000 });
    await recordsTab.click();
    await expect(
      page.locator('#dd-civ-d-body .dd-civ-record', { hasText: 'E2E record deletion citation' })
    ).toBeVisible({ timeout: 15_000 });
  }

  test('shows delete on your own record by default', async ({ page }) => {
    await serveCommunityAsPlayer(page, undefined);
    await openOwnCivilianRecords(page);
    await expect(page.locator('#dd-civ-d-body .dd-rec-delete')).toHaveCount(1);
  });

  test('hides delete on your own record when the community turns it off', async ({ page }) => {
    await serveCommunityAsPlayer(page, false);
    await openOwnCivilianRecords(page);
    await expect(page.locator('#dd-civ-d-body .dd-rec-delete')).toHaveCount(0);
  });
});
