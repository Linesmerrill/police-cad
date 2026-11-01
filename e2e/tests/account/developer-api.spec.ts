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

const KEY_ID = 'aaaaaaaaaaaaaaaaaaaaaaa1';
const COMMUNITY_ID = TEST_COMMUNITY_ID.toHexString();

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
  account: { id: 'dev1', plan: 'free', planActive: false, status: 'active' },
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

    await expect(page.getByRole('heading', { name: 'Turn on your developer account' })).toBeVisible();

    // The button stays disabled until the Developer Terms are accepted: a
    // developer can create accounts for players who never saw them.
    const enable = page.getByRole('button', { name: 'Turn on developer account' });
    await expect(enable).toBeDisabled();

    await page.locator('#dev-terms').check();
    await expect(enable).toBeEnabled();
  });

  test('an enabled account lists its keys, scopes and plan limits', async ({ page }) => {
    await mockAccount(page, ENABLED_ACCOUNT);
    await mockKeys(page, ONE_KEY);
    await page.goto('/developer');

    await expect(page.getByText('Your plan: Free')).toBeVisible();
    await expect(page.getByText('60 requests a minute, 10,000 a day, up to 2 keys.')).toBeVisible();

    const row = page.getByTestId('key-row');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('My FiveM server');
    // The prefix is shown; the key itself does not exist to show.
    await expect(row).toContainText('lpc_live_a1b2c3d4');
    await expect(row).toContainText('units:write');
    await expect(row).toContainText('test community');
  });

  test('creating a key reveals it exactly once, with a warning', async ({ page }) => {
    await mockAccount(page, ENABLED_ACCOUNT);
    await mockKeys(page, []);
    await page.route('**/api/developer/keys', (route: Route) => {
      if (route.request().method() === 'POST') {
        return json(
          route,
          {
            key: { id: KEY_ID, name: 'New key', displayPrefix: 'lpc_live_zzzz', scopes: ['units:write'], status: 'active' },
            plaintextKey: 'lpc_live_thisisthesecretvalue',
          },
          201
        );
      }
      return json(route, { keys: [], limits: LIMITS });
    });

    await page.goto('/developer');
    await page.getByTestId('new-key-button').click();
    await expect(page.getByTestId('create-key-form')).toBeVisible();

    await page.locator('#dev-key-name').fill('New key');
    // A key with no community needs the provisioning scope, which the form says.
    await page.locator('input[value="communities:provision"]').check();
    await page.getByTestId('create-key-submit').click();

    const reveal = page.getByTestId('key-reveal');
    await expect(reveal).toBeVisible();
    await expect(reveal).toContainText('lpc_live_thisisthesecretvalue');
    await expect(reveal).toContainText('this is the one and only time it can be shown');
  });

  test('revoking a key asks first, through the page and not a native dialog', async ({ page }) => {
    await mockAccount(page, ENABLED_ACCOUNT);
    await mockKeys(page, ONE_KEY);

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

    await page.goto('/developer');
    // Scoped to the key's own row: "Turn off and revoke all keys" further down
    // the page matches a bare "Revoke" too.
    await page.getByTestId('key-row').getByRole('button', { name: 'Revoke' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('stops working immediately');
    expect(deleteCalled).toBe(false);

    await page.getByTestId('confirm-action').click();
    await expect.poll(() => deleteCalled).toBe(true);
    expect(nativeDialog).toBe(false);
  });

  test('the usage panel shows today against the limit', async ({ page }) => {
    await mockAccount(page, ENABLED_ACCOUNT);
    await mockKeys(page, ONE_KEY);
    await page.route(`**/api/developer/keys/${KEY_ID}/usage*`, (route: Route) =>
      json(route, {
        plan: 'free',
        requestsToday: 2500,
        requestsThisMonth: 41000,
        dailyLimit: 10000,
        minuteLimit: 60,
        dailyPercent: 25,
        resetsAt: '2026-11-01T00:00:00Z',
        errorsToday: { rateLimited: 3, unauthorized: 1, forbidden: 0 },
        hasErrorsToday: true,
        series: [],
      })
    );

    await page.goto('/developer');
    await page.getByRole('button', { name: 'Usage' }).click();

    const panel = page.getByTestId('usage-panel');
    await expect(panel).toContainText('2,500');
    await expect(panel).toContainText('requests today of 10,000');
    await expect(panel).toContainText('429 rate limited: 3');
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

    await page.goto(`/community/${COMMUNITY_ID}/api-keys`);

    await expect(page.getByText('1 key is waiting for your decision.')).toBeVisible();
    await expect(page.getByText('Waiting mod')).toBeVisible();
    await expect(page.getByText('This key can change data in this community.')).toBeVisible();

    await page.getByRole('button', { name: 'Approve' }).click();
    // ddModal, not a native confirm.
    await expect(page.getByText('Approve this key?')).toBeVisible();
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

  test('the developer page needs a login', async ({ page }) => {
    await page.goto('/developer');
    await expect(page).toHaveURL(/\/login/);
  });
});
