/**
 * Admin console, Content Creators panel: the lifetime Partner Premium transfer
 * allowance and the staff control that raises it.
 *
 * The grant goes through our own Express route (POST
 * /admin/content-creators/:id/transfers) so the mutation sits behind an admin
 * session on this origin and the shared API key stays server-side. That route
 * and the Go endpoint behind it are mocked here with page.route: this spec
 * exercises the panel, not the API.
 *
 * Logged in as a non-owner `admin` on a dedicated admin_users row, to prove
 * staff (not just owner) can reach the control.
 */
import { test, expect, Page, Route } from '@playwright/test';
import {
  seedConsoleCreatorStaff,
  removeConsoleCreatorStaff,
  TEST_CONSOLE_CC_STAFF_EMAIL,
  TEST_CONSOLE_CC_STAFF_PASSWORD,
} from '../../helpers/admin-users';

test.use({ storageState: { cookies: [], origins: [] } });

const CREATOR_ID = 'd1d1d1d1d1d1d1d1d1d1d1d1';
const APPLICATION_ID = 'e1e1e1e1e1e1e1e1e1e1e1e1';

const APPROVED_APPLICATION = {
  _id: APPLICATION_ID,
  displayName: 'Nightshift Gaming',
  status: 'approved',
  createdAt: '2026-02-11T09:00:00Z',
  primaryPlatform: 'twitch',
  description: 'I run a long-running GTA roleplay server and stream the dispatch side of it.',
  platforms: [{ type: 'twitch', url: 'https://twitch.tv/nightshift', handle: 'nightshift', followerCount: 8100 }],
  creatorId: CREATOR_ID,
  creatorStatus: 'active',
  checksPassed: true,
  // The transfer allowance the API joins onto approved rows.
  transfersUsed: 1,
  transferLimit: 3,
  transfersRemaining: 2,
};

interface ConsoleMocks {
  application?: Record<string, unknown>;
  grantStatus?: number;
  grantBody?: unknown;
  onGrant?: (body: unknown) => void;
}

async function mockConsole(page: Page, mocks: ConsoleMocks = {}) {
  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  const application = mocks.application || APPROVED_APPLICATION;

  // One handler for the applications list and the filter-chip counts, which
  // share a path and differ only by query string.
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
        applications: [application],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1, hasNextPage: false, hasPrevPage: false },
      });
    }
  );

  // The "active in the creator program" count.
  await page.route(
    (url) => url.pathname === '/api/v1/admin/content-creators',
    (route: Route) =>
      json(route, 200, { success: true, creators: [], pagination: { totalItems: 4, totalPages: 1 } })
  );

  await page.route(
    (url) => /^\/admin\/content-creators\/[^/]+\/transfers$/.test(url.pathname),
    (route: Route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      if (mocks.onGrant) mocks.onGrant(route.request().postDataJSON());
      return json(
        route,
        mocks.grantStatus || 200,
        mocks.grantBody !== undefined
          ? mocks.grantBody
          : { success: true, transfersUsed: 1, transferLimit: 5, transfersRemaining: 4 }
      );
    }
  );
}

async function openCreatorsPanel(page: Page) {
  await page.goto('/admin');
  await page.locator('input[name="email"]').fill(TEST_CONSOLE_CC_STAFF_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_CONSOLE_CC_STAFF_PASSWORD);
  await Promise.all([
    page.waitForURL('**/admin/console**', { timeout: 15_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
  // The tab is revealed once the session roles load; clicking it is what
  // triggers the panel's lazy load (panelLoadCallbacks).
  const tab = page.locator('[data-panel="content-creators"]').first();
  await expect(tab).toBeVisible({ timeout: 15_000 });
  await tab.click();
  await expect(page.locator('#ccApplicationResults')).toContainText('Nightshift Gaming', {
    timeout: 15_000,
  });
}

test.describe('Admin console — creator Premium transfers', { tag: '@admin' }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await seedConsoleCreatorStaff();
  });

  test.afterAll(async () => {
    await removeConsoleCreatorStaff();
  });

  test('shows the lifetime transfer allowance on an approved creator', async ({ page }) => {
    await mockConsole(page);
    await openCreatorsPanel(page);

    const cell = page.locator(`[data-cc-transfers="${CREATOR_ID}"]`);
    await expect(cell).toBeVisible();
    await expect(cell).toContainText('Transfers 1 of 3');
    await expect(cell).toContainText('2 left');
  });

  test('omits the allowance when the API did not send one', async ({ page }) => {
    const withoutTransfers = { ...APPROVED_APPLICATION };
    delete (withoutTransfers as Record<string, unknown>).transfersUsed;
    delete (withoutTransfers as Record<string, unknown>).transferLimit;
    delete (withoutTransfers as Record<string, unknown>).transfersRemaining;

    await mockConsole(page, { application: withoutTransfers });
    await openCreatorsPanel(page);

    // No invented numbers, but the control is still reachable.
    await expect(page.locator(`[data-cc-transfers="${CREATOR_ID}"]`)).toHaveCount(0);
    await expect(
      page.locator('#ccApplicationResults').getByRole('button', { name: /Transfers/ })
    ).toBeVisible();
  });

  test('grant dialog previews the new limit and requires both fields', async ({ page }) => {
    await mockConsole(page);
    await openCreatorsPanel(page);

    await page.locator('#ccApplicationResults').getByRole('button', { name: /Transfers/ }).click();
    const modal = page.locator('#ccTransfersModal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#ccTransfersCreatorName')).toHaveText('Nightshift Gaming');
    await expect(modal.locator('#ccTransfersCurrentLine')).toContainText('Currently 1 of 3 used.');
    await expect(modal.locator('#ccTransfersPreview')).toContainText(
      'Lifetime limit goes from 3 to 4 (1 extra transfer).'
    );

    await modal.locator('#ccTransfersAmount').fill('2');
    await expect(modal.locator('#ccTransfersPreview')).toContainText(
      'Lifetime limit goes from 3 to 5 (2 extra transfers).'
    );

    // A reason is mandatory, and the error names the field rather than a toast.
    await modal.locator('#confirmGrantTransfersBtn').click();
    await expect(modal.locator('#ccTransfersError')).toContainText('A reason is required.');

    // Out of range is named with the range, not silently coerced.
    await modal.locator('#ccTransfersReason').fill('Agreed with the creator on stream.');
    await modal.locator('#ccTransfersAmount').fill('25');
    await modal.locator('#confirmGrantTransfersBtn').click();
    await expect(modal.locator('#ccTransfersError')).toContainText(
      'Enter a number of transfers between 1 and 10.'
    );
  });

  test('granting posts through the website route and updates the row in place', async ({ page }) => {
    const posted: unknown[] = [];
    await mockConsole(page, { onGrant: (body) => posted.push(body) });
    await openCreatorsPanel(page);

    await page.locator('#ccApplicationResults').getByRole('button', { name: /Transfers/ }).click();
    const modal = page.locator('#ccTransfersModal');
    await modal.locator('#ccTransfersAmount').fill('2');
    await modal.locator('#ccTransfersReason').fill('Lost the first boost to a deleted community.');
    await modal.locator('#confirmGrantTransfersBtn').click();

    await expect(page.locator('#infoModalBody')).toContainText('Granted 2 extra transfers.', {
      timeout: 15_000,
    });
    expect(posted).toEqual([
      { additional: 2, reason: 'Lost the first boost to a deleted community.' },
    ]);

    // Patched from the response rather than reloading the queue.
    const cell = page.locator(`[data-cc-transfers="${CREATOR_ID}"]`);
    await expect(cell).toContainText('Transfers 1 of 5');
    await expect(cell).toContainText('4 left');
  });

  test('a refusal is reported in the dialog and the row is left alone', async ({ page }) => {
    await mockConsole(page, {
      grantStatus: 403,
      grantBody: { message: 'forbidden: owner access required' },
    });
    await openCreatorsPanel(page);

    await page.locator('#ccApplicationResults').getByRole('button', { name: /Transfers/ }).click();
    const modal = page.locator('#ccTransfersModal');
    await modal.locator('#ccTransfersReason').fill('Testing the refusal path.');
    await modal.locator('#confirmGrantTransfersBtn').click();

    await expect(modal.locator('#ccTransfersError')).toContainText('Failed to grant transfers');
    await expect(modal.locator('#ccTransfersError')).toContainText('forbidden: owner access required');
    await expect(page.locator(`[data-cc-transfers="${CREATOR_ID}"]`)).toContainText('Transfers 1 of 3');
  });
});
