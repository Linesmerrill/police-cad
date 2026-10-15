/**
 * Invite codes on the community details page (Share flow).
 *
 * The browser now reaches create / list / delete / delete-expired through this
 * site's own Express routes, which attach the logged-in user before calling the
 * API. These specs pin that down: every invite-code request the page makes must
 * be to one of our routes, and a refusal forwarded from the API has to arrive in
 * front of the admin with the API's own wording.
 *
 * Our routes are mocked with page.route so the specs do not depend on the API's
 * invite-code handlers, which are a separate workstream.
 */
import { test, expect, Page, Route } from '@playwright/test';
import { communityDetailsUrl } from '../../helpers/test-urls';
import { TEST_COMMUNITY_ID } from '../../helpers/seed';

const COMMUNITY_ID = TEST_COMMUNITY_ID.toHexString();

interface FakeCode {
  _id: string;
  code: string;
  maxUses: number;
  remainingUses: number;
  uses: number;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
  createdByUser?: { id: string; username: string } | null;
}

const IN_A_WEEK = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
const LAST_WEEK = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
const MADE_ON = '2026-03-04T12:00:00.000Z';
/** A username is whatever someone signed up with, markup included. */
const CREATOR_NAME = 'Kim <b>Doe</b>';
const CREATOR_ID = '11'.padEnd(24, '0');

/**
 * The three creator states a community really has: a code whose creator we can
 * name, one naming an account that is gone, and an older one that recorded no
 * creator at all.
 */
function seedCodes(): FakeCode[] {
  return [
    { _id: 'a1'.padEnd(24, '0'), code: 'ALPHA1', maxUses: 5, remainingUses: 3, uses: 2, expiresAt: IN_A_WEEK,
      createdAt: MADE_ON, createdBy: CREATOR_ID, createdByUser: { id: CREATOR_ID, username: CREATOR_NAME } },
    { _id: 'b2'.padEnd(24, '0'), code: 'BRAVO2', maxUses: 0, remainingUses: 0, uses: 9, expiresAt: null,
      createdAt: MADE_ON, createdBy: '22'.padEnd(24, '0'), createdByUser: null },
    { _id: 'c3'.padEnd(24, '0'), code: 'OLDONE', maxUses: 1, remainingUses: 1, uses: 0, expiresAt: LAST_WEEK,
      createdAt: MADE_ON, createdBy: '', createdByUser: null },
  ];
}

interface Recorded {
  /** GET list requests to our own route, in order. */
  lists: URL[];
  /** POST create bodies sent to our own route, in order. */
  creates: Array<Record<string, unknown>>;
  /** Ids passed to our own delete route, in order. */
  deletes: string[];
  /** How many times delete-expired was called on our own route. */
  deleteExpired: number;
  /** Any invite-code request that went straight to the API. Must stay empty. */
  directApiCalls: string[];
}

interface Refusals {
  /** Status + body our route answers a create with, instead of succeeding. */
  create?: { status: number; body: unknown };
  /** Status + body our route answers the list with, instead of succeeding. */
  list?: { status: number; body: unknown };
}

/**
 * Stands in for the Express invite-code routes with a tiny in-memory backend,
 * so a spec can check what the page asks for after an action and not only what
 * it shows. Also traps any direct call to the API's invite-code endpoints.
 */
async function mockInviteCodeRoutes(page: Page, refusals: Refusals = {}) {
  let codes = seedCodes();
  const recorded: Recorded = { lists: [], creates: [], deletes: [], deleteExpired: 0, directApiCalls: [] };

  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  const listBody = (page_: number, limit: number) => {
    const totalPages = Math.max(1, Math.ceil(codes.length / limit));
    return {
      inviteCodes: codes.slice((page_ - 1) * limit, page_ * limit),
      pagination: {
        currentPage: page_,
        limit,
        totalCount: codes.length,
        totalPages,
        hasNextPage: page_ < totalPages,
        hasPrevPage: page_ > 1,
      },
      expiredCount: codes.filter((c) => c.expiresAt && new Date(c.expiresAt) < new Date()).length,
    };
  };

  // Nothing in the page may talk to the API's invite-code endpoints any more.
  await page.route(
    (url) =>
      /\/api\/v1\/community\/[^/]+\/add-invite-code$/.test(url.pathname) ||
      /\/api\/v[12]\/community\/[^/]+\/invite-codes(\/expired)?$/.test(url.pathname) ||
      /\/api\/v1\/invite-code\/[^/]+$/.test(url.pathname),
    async (route) => {
      recorded.directApiCalls.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
      await json(route, 500, { message: 'the page must not call the API directly' });
    },
  );

  // Our own routes: POST/GET /community/:id/invite-codes and
  // DELETE /community/:id/invite-codes/expired.
  await page.route(
    (url) => url.pathname.startsWith(`/community/${COMMUNITY_ID}/invite-codes`),
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const isExpired = url.pathname.endsWith('/invite-codes/expired');

      if (request.method() === 'DELETE' && isExpired) {
        recorded.deleteExpired += 1;
        const before = codes.length;
        codes = codes.filter((c) => !(c.expiresAt && new Date(c.expiresAt) < new Date()));
        return json(route, 200, { deletedCount: before - codes.length });
      }
      if (request.method() === 'GET' && !isExpired) {
        recorded.lists.push(url);
        if (refusals.list) return json(route, refusals.list.status, refusals.list.body);
        return json(
          route,
          200,
          listBody(Number(url.searchParams.get('page') || '1'), Number(url.searchParams.get('limit') || '10')),
        );
      }
      if (request.method() === 'POST' && !isExpired) {
        const body = request.postDataJSON() as Record<string, unknown>;
        recorded.creates.push(body);
        if (refusals.create) return json(route, refusals.create.status, refusals.create.body);
        codes = [
          {
            _id: 'd4'.padEnd(24, '0'),
            code: String(body.code),
            maxUses: Number(body.maxUses || 0),
            remainingUses: Number(body.maxUses || 0),
            uses: 0,
            expiresAt: (body.expiresAt as string) || null,
            createdAt: new Date().toISOString(),
            createdBy: CREATOR_ID,
            createdByUser: { id: CREATOR_ID, username: CREATOR_NAME },
          },
          ...codes,
        ];
        return json(route, 201, { message: 'Invite code created', code: body.code });
      }
      return route.fallback();
    },
  );

  // Our own route: DELETE /invite-codes/:id.
  await page.route(
    (url) => /^\/invite-codes\/[0-9a-z]{24}$/.test(url.pathname),
    async (route) => {
      if (route.request().method() !== 'DELETE') return route.fallback();
      const id = new URL(route.request().url()).pathname.split('/').pop() as string;
      recorded.deletes.push(id);
      codes = codes.filter((c) => c._id !== id);
      await json(route, 200, { message: 'Invite code deleted' });
    },
  );

  return recorded;
}

/** Loads the community page. False when the community did not render. */
async function openCommunity(page: Page): Promise<boolean> {
  await page.goto(communityDetailsUrl());
  await expect(page).not.toHaveURL(/\/login/);
  return page
    .locator('#community-overview')
    .isVisible({ timeout: 10_000 })
    .catch(() => false);
}

async function openInviteCodes(page: Page) {
  await page.evaluate(() => (window as unknown as { openInviteCodesModal: () => void }).openInviteCodesModal());
  await expect(page.locator('#inviteCodesModal')).toBeVisible();
}

function row(page: Page, code: string) {
  return page.locator('#inviteCodesList > div').filter({ has: page.locator('code', { hasText: code }) });
}

test.describe('Community invite codes', { tag: '@auth' }, () => {
  test('lists the codes through the site\'s own route and never the API', async ({ page }) => {
    const recorded = await mockInviteCodeRoutes(page);
    test.skip(!(await openCommunity(page)), 'Community API not reachable, the community page did not render');
    await openInviteCodes(page);

    await expect(row(page, 'ALPHA1')).toBeVisible();
    await expect(row(page, 'BRAVO2')).toBeVisible();
    await expect(page.locator('#inviteCodesList > div')).toHaveCount(3);

    // Asked our route, with the paging the modal shows.
    expect(recorded.lists.length).toBeGreaterThan(0);
    expect(recorded.lists[0].pathname).toBe(`/community/${COMMUNITY_ID}/invite-codes`);
    expect(recorded.lists[0].searchParams.get('page')).toBe('1');
    expect(recorded.lists[0].searchParams.get('limit')).toBe('10');
    // No caller id on the query string: the route reads it from the session.
    expect(recorded.lists[0].searchParams.get('userId')).toBeNull();
    expect(recorded.directApiCalls).toEqual([]);
  });

  test('names who created each code, and what is known when it cannot', async ({ page }) => {
    await mockInviteCodeRoutes(page);
    test.skip(!(await openCommunity(page)), 'Community API not reachable, the community page did not render');
    await openInviteCodes(page);
    await expect(row(page, 'ALPHA1')).toBeVisible();

    // The date is rendered in the browser's locale, so match the shape.
    await expect(row(page, 'ALPHA1')).toContainText(`Created by ${CREATOR_NAME} on`);
    // The creator's name is text, not markup.
    await expect(row(page, 'ALPHA1').locator('b')).toHaveCount(0);
    await expect(row(page, 'BRAVO2')).toContainText(/Created on .+, account no longer exists/);
    await expect(row(page, 'OLDONE')).toContainText(/Created on .+, creator not recorded/);
    // Nothing anywhere says the lookup failed.
    await expect(page.locator('#inviteCodesList')).not.toContainText(/unknown/i);
  });

  test('creates a code through the site\'s own route and names no creator', async ({ page }) => {
    const recorded = await mockInviteCodeRoutes(page);
    test.skip(!(await openCommunity(page)), 'Community API not reachable, the community page did not render');
    await openInviteCodes(page);
    await expect(row(page, 'ALPHA1')).toBeVisible();

    await page.locator('#inviteCodeInput').fill('FRESH1');
    await page.locator('#expireAfterSelect').selectOption('1d');
    await page.locator('#maxUsesSelect').selectOption('5');
    const listsBefore = recorded.lists.length;
    await page.locator('#inviteCodesModal button', { hasText: 'Create Invite Code' }).click();

    await expect(page.locator('#inviteCodeSuccessModal')).toBeVisible();
    await expect(page.locator('#successCode')).toHaveText('FRESH1');

    expect(recorded.creates).toHaveLength(1);
    const body = recorded.creates[0];
    expect(body.code).toBe('FRESH1');
    expect(body.maxUses).toBe(5);
    expect(typeof body.expiresAt).toBe('string');
    // The creator is the session user on the server, never anything the page says.
    expect(Object.keys(body).sort()).toEqual(['code', 'expiresAt', 'maxUses']);
    expect(recorded.directApiCalls).toEqual([]);

    // The list refreshes, and the new code is in it.
    await expect.poll(() => recorded.lists.length).toBeGreaterThan(listsBefore);
    await expect(row(page, 'FRESH1')).toBeVisible();
  });

  test('deletes a code through the site\'s own route', async ({ page }) => {
    const recorded = await mockInviteCodeRoutes(page);
    test.skip(!(await openCommunity(page)), 'Community API not reachable, the community page did not render');
    await openInviteCodes(page);
    await expect(row(page, 'ALPHA1')).toBeVisible();

    await row(page, 'ALPHA1').locator('button[title="Delete"]').click();
    await expect(page.locator('#deleteConfirmModal')).toBeVisible();
    await expect(page.locator('#deleteCodeName')).toHaveText('ALPHA1');
    await page.locator('#deleteConfirmModal button', { hasText: 'Delete' }).click();

    await expect(page.locator('#deleteConfirmModal')).toBeHidden();
    await expect(row(page, 'ALPHA1')).toHaveCount(0);
    expect(recorded.deletes).toEqual(['a1'.padEnd(24, '0')]);
    expect(recorded.directApiCalls).toEqual([]);
  });

  test('removes the expired codes through the site\'s own route', async ({ page }) => {
    const recorded = await mockInviteCodeRoutes(page);
    test.skip(!(await openCommunity(page)), 'Community API not reachable, the community page did not render');
    await openInviteCodes(page);
    await expect(row(page, 'OLDONE')).toBeVisible();

    await expect(page.locator('#expiredCodesHelper')).toBeVisible();
    await expect(page.locator('#expiredCodesCount')).toHaveText('1');
    await page.locator('#expiredCodesHelper button', { hasText: 'Remove Expired' }).click();
    await expect(page.locator('#deleteExpiredModal')).toBeVisible();
    await page.locator('#deleteExpiredModal button', { hasText: 'Delete All Expired' }).click();

    await expect(page.locator('#toast')).toContainText('Deleted 1 expired invite code');
    await expect(row(page, 'OLDONE')).toHaveCount(0);
    expect(recorded.deleteExpired).toBe(1);
    expect(recorded.directApiCalls).toEqual([]);
  });

  test('shows the reason when a creator may not manage members', async ({ page }) => {
    const recorded = await mockInviteCodeRoutes(page, {
      create: { status: 403, body: { response: { message: 'insufficient permissions' } } },
    });
    test.skip(!(await openCommunity(page)), 'Community API not reachable, the community page did not render');
    await openInviteCodes(page);
    await expect(row(page, 'ALPHA1')).toBeVisible();

    await page.locator('#inviteCodeInput').fill('NOPE12');
    await page.locator('#inviteCodesModal button', { hasText: 'Create Invite Code' }).click();

    // The API's own wording, not a generic failure.
    await expect(page.locator('#toast')).toContainText('insufficient permissions');
    await expect(page.locator('#inviteCodeSuccessModal')).toBeHidden();
    expect(recorded.creates).toHaveLength(1);
  });

  test('shows the reason when the list is refused', async ({ page }) => {
    await mockInviteCodeRoutes(page, {
      list: { status: 403, body: { response: { message: 'insufficient permissions' } } },
    });
    test.skip(!(await openCommunity(page)), 'Community API not reachable, the community page did not render');
    await openInviteCodes(page);

    await expect(page.locator('#inviteCodesError')).toBeVisible();
    await expect(page.locator('#inviteCodesError')).toContainText('insufficient permissions');
  });
});
