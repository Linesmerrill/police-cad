import { Page, Locator, Request, expect } from '@playwright/test';
import { communityDetailsUrl } from '../helpers/test-urls';

/** A 24-char hex id that is stable for a given prefix and index. */
export function fakeId(prefix: string, i: number): string {
  return (prefix + i.toString(16).padStart(6, '0')).padEnd(24, '0').slice(0, 24);
}

export interface FakeMember {
  id: string;
  username: string;
}

export interface FakeCivilian {
  id: string;
  name: string;
}

/**
 * Page object for the community details admin lists: the Members modal
 * (inline script in community-details-modals.ejs) and the Civilians modal
 * (public/js/community-details.js).
 *
 * Both lists are rendered client-side from the API, so the stubs below act as
 * a tiny in-memory backend: list and search calls page through the current
 * rows, and the bulk/single delete calls remove rows from it. That lets a test
 * check what the page asks for after an action, not just what it shows.
 */
export class CommunityAdminListsPage {
  readonly page: Page;

  members: FakeMember[] = [];
  civilians: FakeCivilian[] = [];

  /** Every members list/search GET, in order. */
  memberListRequests: URL[] = [];
  /** Every civilians list GET, in order. */
  civilianListRequests: URL[] = [];
  /** Every civilians search POST body, in order. */
  civilianSearchBodies: Array<Record<string, unknown>> = [];
  /** Bodies sent to the bulk endpoints. */
  bulkKickBodies: Array<{ userIds: string[] }> = [];
  bulkCivDeleteBodies: Array<{ civilianIds: string[] }> = [];

  constructor(page: Page) {
    this.page = page;
  }

  // ---- stubs ---------------------------------------------------------------

  async stubMembers(members: FakeMember[]) {
    this.members = [...members];

    await this.page.route(
      (url) => /\/api\/v1\/community\/[^/]+\/members(\/search)?$/.test(url.pathname),
      async (route) => {
        const req = route.request();
        if (req.method() !== 'GET') return route.continue();
        const url = new URL(req.url());
        this.memberListRequests.push(url);
        const page = Number(url.searchParams.get('page') || '1');
        const limit = Number(url.searchParams.get('limit') || '20');
        const isSearch = url.pathname.endsWith('/search');
        const q = (url.searchParams.get('q') || '').toLowerCase();
        const rows = isSearch ? this.members.filter((m) => m.username.toLowerCase().includes(q)) : this.members;
        const slice = rows.slice((page - 1) * limit, page * limit);

        const body = isSearch
          ? {
              members: slice.map((m) => ({ id: m.id, username: m.username })),
              pagination: { totalCount: rows.length, currentPage: page },
            }
          : {
              members: slice.map((m) => ({ _id: m.id, user: { username: m.username, communities: [] } })),
              totalUsers: rows.length,
            };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      },
    );

    await this.page.route(
      (url) => /\/api\/v1\/community\/[^/]+\/members\/bulk-remove$/.test(url.pathname),
      async (route) => {
        const body = route.request().postDataJSON() as { userIds: string[] };
        this.bulkKickBodies.push(body);
        const ids = new Set(body.userIds);
        this.members = this.members.filter((m) => !ids.has(m.id));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: body.userIds.map((id) => ({ id, ok: true })),
            succeeded: body.userIds.length,
            failed: 0,
          }),
        });
      },
    );
  }

  async stubCivilians(civilians: FakeCivilian[]) {
    this.civilians = [...civilians];
    const toRow = (c: FakeCivilian) => ({
      _id: c.id,
      civilian: { name: c.name, approvalStatus: 'no_status' },
    });

    await this.page.route(
      (url) => /\/api\/v2\/community\/[^/]+\/civilians$/.test(url.pathname),
      async (route) => {
        const req = route.request();
        if (req.method() !== 'GET') return route.continue();
        const url = new URL(req.url());
        this.civilianListRequests.push(url);
        const page = Number(url.searchParams.get('page') || '1');
        const limit = Number(url.searchParams.get('limit') || '10');
        const totalPages = Math.ceil(this.civilians.length / limit);
        const slice = this.civilians.slice((page - 1) * limit, page * limit);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            civilians: slice.map(toRow),
            pagination: {
              currentPage: page,
              limit,
              totalCount: this.civilians.length,
              totalPages,
              hasNext: page < totalPages,
              hasPrev: page > 1,
            },
          }),
        });
      },
    );

    await this.page.route(
      (url) => url.pathname.endsWith('/api/v2/civilians/search'),
      async (route) => {
        const body = route.request().postDataJSON() as { query: string };
        this.civilianSearchBodies.push(body);
        const q = String(body.query || '').toLowerCase();
        const rows = this.civilians.filter((c) => c.name.toLowerCase().includes(q));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            civilians: rows.map(toRow),
            pagination: { currentPage: 0, limit: 50, totalRecords: rows.length, totalPages: 1 },
          }),
        });
      },
    );

    await this.page.route(
      (url) => /\/api\/v1\/community\/[^/]+\/civilians\/bulk-delete$/.test(url.pathname),
      async (route) => {
        const body = route.request().postDataJSON() as { civilianIds: string[] };
        this.bulkCivDeleteBodies.push(body);
        const ids = new Set(body.civilianIds);
        this.civilians = this.civilians.filter((c) => !ids.has(c.id));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: body.civilianIds.map((id) => ({ id, ok: true })),
            succeeded: body.civilianIds.length,
            failed: 0,
          }),
        });
      },
    );

    await this.page.route(
      (url) => /\/api\/v1\/civilian\/[0-9a-f]{24}$/.test(url.pathname),
      async (route) => {
        if (route.request().method() !== 'DELETE') return route.continue();
        const id = new URL(route.request().url()).pathname.split('/').pop();
        this.civilians = this.civilians.filter((c) => c.id !== id);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Civilian deleted successfully' }),
        });
      },
    );
  }

  // ---- navigation ----------------------------------------------------------

  /**
   * Loads the community page. Returns false when the page could not render the
   * community (API unreachable in this environment), so the caller can skip.
   */
  async goto(): Promise<boolean> {
    await this.page.goto(communityDetailsUrl());
    await expect(this.page).not.toHaveURL(/\/login/);
    return this.page
      .locator('#community-overview')
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
  }

  async openMembers() {
    await this.page.evaluate(() => (window as any).openMembersModal());
    await expect(this.membersModal).toBeVisible();
    await expect(this.memberRows.first()).toBeVisible();
  }

  async openCivilians() {
    await this.page.evaluate(() => (window as any).openCiviliansModal());
    await expect(this.civiliansModal).toBeVisible();
    await expect(this.civilianRows.first()).toBeVisible();
  }

  // ---- members -------------------------------------------------------------

  get membersModal(): Locator {
    return this.page.locator('#membersModal');
  }
  get memberRows(): Locator {
    return this.page.locator('#membersListContainer .member-item');
  }
  memberCheckbox(id: string): Locator {
    return this.page.locator(`#membersListContainer .member-select[data-member-id="${id}"]`);
  }
  get membersSelectedCount(): Locator {
    return this.page.locator('#membersSelectedCount');
  }
  get membersBulkKickBtn(): Locator {
    return this.page.locator('#membersBulkKickBtn');
  }
  get membersPageInfo(): Locator {
    return this.page.locator('#pageInfo');
  }
  // Scoped to the modal: the role editor's "Add Members" step reuses the id.
  get memberSearchInput(): Locator {
    return this.page.locator('#membersModal #memberSearchInput');
  }

  // The page's shared confirm dialog.
  get confirmModal(): Locator {
    return this.page.locator('#customConfirmModal');
  }
  get confirmMessage(): Locator {
    return this.page.locator('#confirmMessage');
  }
  get confirmButton(): Locator {
    return this.page.locator('#confirmActionBtn');
  }

  // ---- civilians -----------------------------------------------------------

  get civiliansModal(): Locator {
    return this.page.locator('#civiliansModal');
  }
  get civilianRows(): Locator {
    return this.page.locator('#civiliansList .civilian-item');
  }
  civilianRow(id: string): Locator {
    return this.page.locator(`#civiliansList .civilian-item[data-civilian-id="${id}"]`);
  }
  civilianCheckbox(id: string): Locator {
    return this.page.locator(`#civiliansList .civilian-select[data-civilian-id="${id}"]`);
  }
  get civiliansSelectAll(): Locator {
    return this.page.locator('#civiliansSelectAll');
  }
  get civiliansSelectedCount(): Locator {
    return this.page.locator('#civiliansSelectedCount');
  }
  get civiliansBulkDeleteBtn(): Locator {
    return this.page.locator('#civiliansBulkDeleteBtn');
  }
  get civiliansSearchInput(): Locator {
    return this.page.locator('#civiliansSearchInput');
  }
  civiliansPageButton(n: number): Locator {
    return this.page.locator('#civiliansPagination button', { hasText: new RegExp(`^\\s*${n}\\s*$`) });
  }
  get deleteCivilianModal(): Locator {
    return this.page.locator('#deleteCivilianConfirmModal');
  }
  get deleteCivilianMessage(): Locator {
    return this.page.locator('#deleteCivilianMessage');
  }
  get deleteCivilianConfirmBtn(): Locator {
    return this.page.locator('#deleteCivilianConfirmBtn');
  }

  /** Waits for the next request matching the predicate, after running action. */
  async expectRequestAfter(action: () => Promise<unknown>, match: (r: Request) => boolean) {
    const waiter = this.page.waitForRequest(match);
    await action();
    return waiter;
  }
}
