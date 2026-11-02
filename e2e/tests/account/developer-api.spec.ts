/**
 * The Developer API pages: the developer's own page, the claim page, the public
 * docs, and the community owner's key list.
 *
 * The proxy routes are mocked at the website's own Express endpoints (the
 * pattern invite-codes.spec.ts uses), because what these specs are checking is
 * the page's behaviour — what it shows, what it gates, what it asks before a
 * destructive action — rather than the Go API behind it, which has its own
 * tests.
 */
import { test, expect, Page, Route } from '@playwright/test';
import { TEST_COMMUNITY_ID } from '../../helpers/seed';
import { communityHash } from '../../helpers/test-urls';

const KEY_ID = 'aaaaaaaaaaaaaaaaaaaaaaa1';
const COMMUNITY_ID = TEST_COMMUNITY_ID.toHexString();
// Pages under /community/ take the encoded id; only the proxy routes take the raw one.
const COMMUNITY_HASH = communityHash();

const SCOPES = [
  { scope: 'community:read', description: "Read the community's profile, departments and ten-codes" },
  { scope: 'units:write', description: "Set a member's status, ten-code and location" },
  { scope: 'civilians:write', description: 'Create and update civilians for linked players' },
  { scope: 'players:provision', description: 'Create and link player accounts from game identifiers' },
  { scope: 'communities:provision', description: 'Create communities owned by you' },
];

const LIMITS = {
  requestsPerMinute: 60,
  requestsPerDay: 10000,
  keysPerDeveloper: 2,
  accountsPerKeyDay: 25,
  communitiesPerKeyDay: 2,
  communitiesPerKey: 3,
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockAccount(page: Page, body: Record<string, unknown>) {
  await page.route('**/api/developer/account', (route: Route) => json(route, body));
}

async function mockKeys(page: Page, keys: unknown[]) {
  await page.route('**/api/developer/keys', (route: Route) => {
    if (route.request().method() === 'GET') return json(route, { keys, limits: LIMITS });
    return route.fallback();
  });
}

const SECOND_COMMUNITY_ID = '507f1f77bcf86cd799439099';

const QUIET_USAGE = {
  plan: 'free',
  days: 30,
  from: '2026-10-03',
  to: '2026-11-01',
  series: [{ day: '2026-11-01', requests: 0, rejected: 0, rejected401: 0, rejected403: 0, rejected429: 0, accountsMade: 0 }],
  keys: [],
  requestsToday: 0,
  rejectedToday: 0,
  requestsThisMonth: 0,
  totalRequests: 0,
  totalRejected: 0,
  peakDay: 0,
  dailyLimit: LIMITS.requestsPerDay,
  minuteLimit: LIMITS.requestsPerMinute,
  dailyPercent: 0,
  resetsAt: '2026-11-02T00:00:00Z',
};

const BUSY_USAGE = {
  ...QUIET_USAGE,
  series: [{ day: '2026-11-01', requests: 2500, rejected: 4, rejected401: 1, rejected403: 0, rejected429: 3, accountsMade: 0 }],
  keys: [{ keyId: KEY_ID, name: 'My FiveM server', status: 'active', requests: 2500, rejected: 4, lastUsedAt: '2026-11-01T08:00:00Z' }],
  requestsToday: 2500,
  rejectedToday: 4,
  requestsThisMonth: 41000,
  totalRequests: 2500,
  totalRejected: 4,
  peakDay: 2500,
  dailyPercent: 25,
};

/**
 * The console loads its account once for the whole section and then the page's
 * own data, so a spec that mocks only one of them gets a page that renders
 * half of itself. One helper, so every spec stands the same ground up.
 */
async function mockConsole(
  page: Page,
  opts: { account: Record<string, unknown>; keys: unknown[]; usage?: Record<string, unknown> }
) {
  await mockAccount(page, opts.account);
  await mockKeys(page, opts.keys);
  await page.route('**/api/developer/usage*', (route: Route) => json(route, opts.usage || QUIET_USAGE));
  await page.route('**/api/developer/communities', (route: Route) =>
    json(route, {
      data: [
        { id: COMMUNITY_ID, name: 'test community', canGrant: true },
        { id: SECOND_COMMUNITY_ID, name: 'second community', canGrant: true },
      ],
      totalCount: 2,
    })
  );
  await page.route('**/api/developer/keys/*/usage*', (route: Route) =>
    json(route, {
      plan: 'free',
      requestsToday: (opts.usage || QUIET_USAGE).requestsToday,
      requestsThisMonth: (opts.usage || QUIET_USAGE).requestsThisMonth,
      dailyLimit: LIMITS.requestsPerDay,
      minuteLimit: LIMITS.requestsPerMinute,
      dailyPercent: (opts.usage || QUIET_USAGE).dailyPercent,
      resetsAt: '2026-11-02T00:00:00Z',
      errorsToday: { rateLimited: 0, unauthorized: 0, forbidden: 0 },
      hasErrorsToday: false,
      series: [],
    })
  );
  // One key, in full, for the key page.
  await page.route('**/api/developer/keys/*', (route: Route) => {
    const method = route.request().method();
    if (method !== 'GET') return route.fallback();
    const url = route.request().url();
    const id = url.split('/api/developer/keys/')[1].split('?')[0].split('/')[0];
    const row = (opts.keys as { key: { id: string } }[]).find((k) => k.key.id === id);
    if (!row) return json(route, { response: { message: 'key not found' } }, 404);
    return json(route, {
      key: (row as Record<string, unknown>).key,
      communities: (row as Record<string, unknown>).communities,
      limits: LIMITS,
      plan: 'free',
      availableScopes: SCOPES,
    });
  });
}

const DISABLED_ACCOUNT = {
  enabled: false,
  limits: LIMITS,
  availableScopes: SCOPES,
  keyCount: 0,
  upgradeAvailable: false,
  termsVersion: '2026-10-31',
};

const ENABLED_ACCOUNT = {
  enabled: true,
  account: { id: 'dev1', status: 'active', createdAt: '2026-09-01T00:00:00Z' },
  entitlement: { plan: 'free', source: 'website', websitePlan: '', lapsed: false },
  limits: LIMITS,
  availableScopes: SCOPES,
  keyCount: 1,
  upgradeAvailable: false,
  termsVersion: '2026-10-31',
};

const ONE_KEY = [
  {
    key: {
      id: KEY_ID,
      name: 'My FiveM server',
      displayPrefix: 'lpc_live_a1b2c3d4',
      lastFour: 'ef12',
      scopes: ['units:write', 'civilians:write', 'community:read'],
      status: 'active',
      createdAt: '2026-10-20T10:00:00Z',
    },
    communities: [{ grant: { communityId: COMMUNITY_ID, status: 'active', source: 'owner_approved' }, communityName: 'test community' }],
  },
];

test.describe('Developer API pages', { tag: '@auth' }, () => {
  test('the developer page offers the terms before a key can exist', async ({ page }) => {
    await mockAccount(page, DISABLED_ACCOUNT);
    await page.goto('/developer');

    await expect(page.getByRole('heading', { name: 'Turn on developer access' })).toBeVisible();

    // The button stays disabled until the Developer Terms are accepted: a
    // developer can create accounts for players who never saw them.
    const enable = page.getByRole('button', { name: 'Turn on developer access' });
    await expect(enable).toBeDisabled();

    await page.locator('#dev-terms').check();
    await expect(enable).toBeEnabled();
  });

  test('the console reports the plan it is actually serving limits for', async ({ page }) => {
    // The regression this exists for: the plan label came from a field the API
    // had stopped sending, so every account rendered "Free" beside the limits
    // it was really getting. The label and the numbers have to agree.
    await mockConsole(page, { account: ENABLED_ACCOUNT, keys: ONE_KEY });
    await page.goto('/developer');

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    // Scoped to the lede, where the label and the numbers are one sentence, so
    // the assertion cannot be satisfied by those words turning up separately
    // somewhere else on the page.
    const lede = page.locator('.dc-lede').first();
    await expect(lede).toContainText('You are on Free');
    await expect(lede).toContainText('60 requests a minute');
    await expect(lede).toContainText('10,000 a day');
  });

  test('the key list shows a key, its communities and its permissions', async ({ page }) => {
    await mockConsole(page, { account: ENABLED_ACCOUNT, keys: ONE_KEY });
    await page.goto('/developer/keys');

    const row = page.locator('.dc-table tbody tr');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('My FiveM server');
    // The prefix is shown; the key itself does not exist to show.
    await expect(row).toContainText('lpc_live_a1b2c3d4');
    await expect(row).toContainText('test community');
    await expect(row).toContainText('3 permissions');
  });

  test('creating a key reveals it exactly once, with a warning', async ({ page }) => {
    await mockConsole(page, { account: ENABLED_ACCOUNT, keys: [] });
    await page.route('**/api/developer/keys', (route: Route) => {
      if (route.request().method() === 'POST') {
        return json(
          route,
          {
            key: { id: KEY_ID, name: 'New key', displayPrefix: 'lpc_live_zzzz', lastFour: 'aa11', scopes: ['units:write'], status: 'active', createdAt: '2026-11-01T09:00:00Z' },
            plaintextKey: 'lpc_live_thisisthesecretvalue',
          },
          201
        );
      }
      return json(route, { keys: [], limits: LIMITS });
    });

    await page.goto('/developer/keys/new');
    await page.locator('#dc-key-name').fill('New key');
    await page.locator('#dc-community').selectOption(COMMUNITY_ID);
    await page.getByRole('button', { name: 'Read only', exact: true }).click();
    await page.getByRole('button', { name: 'Create key' }).click();

    const reveal = page.locator('.dc-secret');
    await expect(reveal).toBeVisible();
    await expect(reveal).toContainText('lpc_live_thisisthesecretvalue');
    await expect(reveal).toContainText('the one and only time it can be shown');
  });

  test('the create form says which field is missing rather than disabling itself', async ({ page }) => {
    // A disabled button with nothing beside it is what sent people hunting for
    // what they had done wrong.
    await mockConsole(page, { account: ENABLED_ACCOUNT, keys: [] });
    await page.goto('/developer/keys/new');

    const submit = page.getByRole('button', { name: 'Create key' });
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.getByText('Give the key a name so you can tell it apart later.')).toBeVisible();
    await expect(page.getByText(/Pick a community, or choose "No community"/)).toBeVisible();
  });

  test('choosing no community ticks the permission that makes that work', async ({ page }) => {
    // The old form told people to leave the field blank and then refused the
    // result. The copy and the rule have to say the same thing.
    await mockConsole(page, { account: ENABLED_ACCOUNT, keys: [] });
    await page.goto('/developer/keys/new');

    await page.locator('#dc-community').selectOption('__none__');
    await expect(page.locator('input[type=checkbox]').nth(4)).toBeChecked();
    await expect(page.locator('.dc-notice-body')).toContainText('communities:provision');
  });

  test('revoking a key asks first, through the page and not a native dialog', async ({ page }) => {
    await mockConsole(page, { account: ENABLED_ACCOUNT, keys: ONE_KEY });

    let deleteCalled = false;
    await page.route(`**/api/developer/keys/${KEY_ID}`, (route: Route) => {
      if (route.request().method() === 'DELETE') {
        deleteCalled = true;
        return json(route, { revoked: true });
      }
      return route.fallback();
    });

    // A native confirm() would block Playwright rather than render; this
    // asserts the page's own dialog.
    let nativeDialog = false;
    page.on('dialog', async (dialog) => {
      nativeDialog = true;
      await dialog.dismiss();
    });

    await page.goto(`/developer/keys/${KEY_ID}`);
    await page.getByRole('button', { name: 'Revoke key' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('stops working immediately');
    // It names what the key actually reaches, rather than saying "its access".
    await expect(dialog).toContainText('test community');
    await expect(dialog).toContainText('units:write');
    expect(deleteCalled).toBe(false);

    await dialog.getByRole('button', { name: 'Revoke key' }).click();
    await expect.poll(() => deleteCalled).toBe(true);
    expect(nativeDialog).toBe(false);
  });

  test('a key page can add and remove communities without a new secret', async ({ page }) => {
    await mockConsole(page, { account: ENABLED_ACCOUNT, keys: ONE_KEY });

    let added: string | null = null;
    await page.route(`**/api/developer/keys/${KEY_ID}/communities`, (route: Route) => {
      added = JSON.parse(route.request().postData() || '{}').communityId;
      return json(route, { grant: { status: 'active' }, communityName: 'second community', added: true }, 201);
    });

    await page.goto(`/developer/keys/${KEY_ID}`);
    await page.locator('#dc-add-community').selectOption(SECOND_COMMUNITY_ID);
    await page.getByRole('button', { name: 'Add community' }).click();

    await expect.poll(() => added).toBe(SECOND_COMMUNITY_ID);
    // No secret is revealed: editing a key must not mean redeploying it.
    await expect(page.locator('.dc-secret')).toHaveCount(0);
  });

  test('the key page says the budget is per key, not per community', async ({ page }) => {
    // The one real consequence of several communities on one key, stated
    // rather than left to be discovered from a 429.
    await mockConsole(page, { account: ENABLED_ACCOUNT, keys: ONE_KEY });
    await page.goto(`/developer/keys/${KEY_ID}`);

    await expect(page.getByText(/counted per key, not per community/i)).toBeVisible();
  });

  test('usage shows today against the limit, and which key spent it', async ({ page }) => {
    await mockConsole(page, { account: ENABLED_ACCOUNT, keys: ONE_KEY, usage: BUSY_USAGE });
    await page.goto('/developer/usage');

    const today = page.locator('.dc-stat', { hasText: 'Requests today' });
    await expect(today).toContainText('2,500');
    await expect(today).toContainText('of 10,000');
    await expect(page.locator('.dc-table')).toContainText('My FiveM server');
  });

  test('notices can be dismissed and do not come back on reload', async ({ page }) => {
    await mockConsole(page, { account: ENABLED_ACCOUNT, keys: ONE_KEY });
    await page.route(`**/api/developer/keys/${KEY_ID}/communities`, (route: Route) =>
      json(route, { grant: { status: 'active' }, communityName: 'second community', added: true }, 201)
    );

    await page.goto(`/developer/keys/${KEY_ID}`);
    await page.locator('#dc-add-community').selectOption(SECOND_COMMUNITY_ID);
    await page.getByRole('button', { name: 'Add community' }).click();

    const notice = page.locator('.dc-notice-good');
    await expect(notice).toBeVisible();
    await notice.getByRole('button', { name: 'Dismiss' }).click();
    await expect(notice).toHaveCount(0);

    await page.reload();
    await expect(page.locator('.dc-notice-good')).toHaveCount(0);
  });

  test('every console page needs a login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    for (const path of ['/developer', '/developer/usage', '/developer/keys', '/developer/keys/new', '/developer/settings']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
    await context.close();
  });

  test('the claim page takes a code however a player types it', async ({ page }) => {
    let sentCode: string | null = null;
    await page.route('**/api/developer/claim', (route: Route) => {
      sentCode = JSON.parse(route.request().postData() || '{}').code;
      return json(route, {
        claimed: true,
        moved: { civilians: 2, vehicles: 3, firearms: 0, licenses: 1, communities: 1 },
        message: 'Your in-game characters are now on this account.',
      });
    });

    await page.goto('/developer/claim');

    // Typed lowercase and without dashes, as a player reads it off a screen.
    await page.getByTestId('claim-code-input').fill('k7m2qx9p4t');
    await expect(page.getByTestId('claim-code-input')).toHaveValue('K7M2-QX9P-4T');
    await page.getByTestId('claim-submit').click();

    await expect(page.getByTestId('claim-success')).toBeVisible();
    await expect(page.getByTestId('claim-success')).toContainText('2 characters');
    await expect(page.getByTestId('claim-success')).toContainText('3 vehicles');
    // The page upper-cases and groups as the player types; stripping the
    // dashes is the proxy's job, covered in test/developer-proxy.test.js. What
    // matters here is that a lowercase, dash-free entry reaches the server as a
    // well-formed code at all.
    expect(sentCode).toBe('K7M2-QX9P-4T');
  });

  test('a bad claim code says so without claiming anything', async ({ page }) => {
    await page.route('**/api/developer/claim', (route: Route) =>
      json(route, { message: 'that code is not valid. Ask the server to show you a new one' }, 404)
    );

    await page.goto('/developer/claim');
    await page.getByTestId('claim-code-input').fill('WRONGCODE1');
    await page.getByTestId('claim-submit').click();

    await expect(page.getByText(/that code is not valid/i)).toBeVisible();
    await expect(page.getByTestId('claim-success')).toHaveCount(0);
  });

  test('the community key page lists pending requests first and asks before approving', async ({ page }) => {
    await page.route(`**/api/developer/community/${COMMUNITY_ID}/keys`, (route: Route) =>
      json(route, {
        keys: [
          {
            keyId: 'bbbbbbbbbbbbbbbbbbbbbbb1',
            status: 'pending',
            source: 'Approved by an admin',
            keyName: 'Waiting mod',
            displayPrefix: 'lpc_live_wwww',
            scopes: ['civilians:write'],
            developerName: 'someone',
            canApprove: true,
            canRevoke: false,
            writeScopes: ['civilians:write'],
          },
          {
            keyId: 'bbbbbbbbbbbbbbbbbbbbbbb2',
            status: 'active',
            source: 'Created by this key',
            keyName: 'Live mod',
            displayPrefix: 'lpc_live_llll',
            scopes: ['units:read'],
            developerName: 'someone else',
            canApprove: false,
            canRevoke: true,
            writeScopes: [],
          },
        ],
        pendingCount: 1,
        activeCount: 1,
      })
    );

    let approved = false;
    await page.route('**/api/developer/community/*/keys/*/approve', (route: Route) => {
      approved = true;
      return json(route, { status: 'active' });
    });

    await page.goto(`/community/${COMMUNITY_HASH}/api-keys`);

    await expect(page.getByText('1 key is waiting for approval.')).toBeVisible();
    await expect(page.getByText('Waiting mod')).toBeVisible();
    await expect(page.getByText('Can change data in this community.')).toBeVisible();

    await page.getByRole('button', { name: 'Approve' }).click();
    // ddModal, not a native confirm.
    await expect(page.getByText(/^Approve /)).toBeVisible();
    expect(approved).toBe(false);

    // Confirm inside the overlay. Its button carries the same label as the row
    // button behind it, and the overlay intercepts clicks aimed at the page.
    await page.locator('#ddm-overlay').getByRole('button', { name: 'Approve' }).click();
    await expect.poll(() => approved).toBe(true);
  });
});

test.describe('Developer API docs', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('the docs are public and carry the FiveM example', async ({ page }) => {
    const response = await page.goto('/api-docs', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { name: 'Developer API', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'A working FiveM resource' })).toBeVisible();
    await expect(page.getByText('PerformHttpRequest')).toBeVisible();

    // The two warnings a developer must not miss.
    await expect(page.getByText(/Send the key in .*Authorization.*not .*X-API-Key/)).toBeVisible();
    await expect(page.getByText(/Use .*set.*not .*setr/)).toBeVisible();
    await expect(page.getByText('Do not loop over your players.')).toBeVisible();
  });
});
