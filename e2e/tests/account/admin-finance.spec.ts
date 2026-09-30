/**
 * Owner-only Finance P&L dashboard (admin console "Finance" tab).
 *
 * The P&L is cash basis from the Plaid bank feed. Covers:
 *  - owner sees the Finance tab and the monthly P&L table (summary mocked at
 *    the website proxy level: /admin/api/finance/*);
 *  - the bank empty state when no bank is connected (income shows earned
 *    subscription revenue only, expenses 0);
 *  - the Plaid "Connect bank" flow (link token -> Link onSuccess -> exchange
 *    -> access token shown once) and "Sync now";
 *  - a non-owner admin neither sees the Finance tab nor reaches the proxy
 *    routes (403 — server-side requireOwnerSession), same for anonymous;
 *  - the POLICE_CAD_API_TOKEN leak fix: most-wanted.ejs must not render the
 *    server API token into client JS anymore.
 *
 * The website proxies are mocked with page.route because the Go API finance
 * handlers are a separate workstream — specs must not depend on them.
 */
import path from 'path';
import { test, expect, Page, Route, request as playwrightRequest } from '@playwright/test';
import {
  seedConsoleOwner,
  removeConsoleOwner,
  TEST_CONSOLE_OWNER_EMAIL,
  TEST_CONSOLE_OWNER_PASSWORD,
  seedConsoleStaff,
  removeConsoleStaff,
  TEST_CONSOLE_STAFF_EMAIL,
  TEST_CONSOLE_STAFF_PASSWORD,
} from '../../helpers/admin-users';
import { encodeIdForUrl, TEST_COMMUNITY_ID } from '../../helpers/db';
import { AdminFinancePage } from '../../pages/admin-finance.page';

const OWNER_STATE = path.join(__dirname, '../../.auth/console-owner-finance.json');
const STAFF_STATE = path.join(__dirname, '../../.auth/console-staff-finance.json');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SUMMARY_BANK_FIXTURE = {
  months: [
    {
      month: '2026-08',
      income: { stripe: 100, iap_gross: 50, iap_net: 35, total: 900 },
      expenses: 320,
      profit: 580,
      bank: { connected: true, income: 900, expenses: 320 },
      sources: {
        stripe: { connected: true },
        revenuecat: { connected: true },
        bank: { connected: true },
      },
    },
    {
      month: '2026-09',
      income: { stripe: 200, iap_gross: 100, iap_net: 70, total: 1200 },
      expenses: 450,
      profit: 750,
      bank: { connected: true, income: 1200, expenses: 450 },
      sources: {
        stripe: { connected: true },
        revenuecat: { connected: true },
        bank: { connected: true },
      },
    },
  ],
  bank_connected: true,
  warnings: ['One bank transaction could not be categorized.'],
};

const SUMMARY_NO_BANK_FIXTURE = {
  months: [
    {
      month: '2026-09',
      income: { stripe: 200, iap_gross: 100, iap_net: 70, total: 300 },
      expenses: 0,
      profit: 300,
      bank: { connected: false, income: 0, expenses: 0 },
      sources: {
        stripe: { connected: true },
        revenuecat: { connected: true },
        bank: { connected: false },
      },
    },
  ],
  bank_connected: false,
  warnings: ['No bank account connected — showing subscription revenue only.'],
};

const PLAID_STATUS_CONNECTED = {
  connected: true,
  last_sync: '2026-09-30T10:00:00Z',
  accounts: [{ name: 'Business Checking', mask: '1234', type: 'depository' }],
};

const PLAID_STATUS_DISCONNECTED = {
  connected: false,
  last_sync: null,
  accounts: [],
};

interface FinanceMocks {
  summary?: unknown;
  summaryStatus?: number;
  plaidStatus?: unknown;
  onLinkToken?: () => unknown;
  onExchange?: (body: unknown) => unknown;
  onSync?: () => unknown;
}

/**
 * Single dispatching mock for /admin/api/finance*. One handler avoids
 * Playwright's last-registered-wins precedence and the
 * continue()-vs-fallback() footgun when several mocks share a URL prefix.
 */
async function mockFinance(page: Page, mocks: FinanceMocks = {}) {
  const plaidStatus = mocks.plaidStatus === undefined ? PLAID_STATUS_DISCONNECTED : mocks.plaidStatus;
  await page.route('**/admin/api/finance/**', (route: Route) => {
    const req = route.request();
    const method = req.method();
    const url = new URL(req.url());
    const path = url.pathname;
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (method === 'GET' && path === '/admin/api/finance/summary') {
      if (mocks.summary !== undefined) {
        return json(mocks.summaryStatus || 200, mocks.summary);
      }
      return route.fallback();
    }
    if (method === 'GET' && path === '/admin/api/finance/plaid/status') {
      return json(200, plaidStatus);
    }
    if (method === 'POST' && path === '/admin/api/finance/plaid/link-token') {
      return json(200, mocks.onLinkToken ? mocks.onLinkToken() : { link_token: 'link-sandbox-test' });
    }
    if (method === 'POST' && path === '/admin/api/finance/plaid/exchange') {
      const body = req.postDataJSON();
      return json(200, mocks.onExchange ? mocks.onExchange(body) : { access_token: 'access-sandbox-test' });
    }
    if (method === 'POST' && path === '/admin/api/finance/plaid/sync') {
      return json(200, mocks.onSync ? mocks.onSync() : { ok: true });
    }
    return route.fallback();
  });
}

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/admin');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL('**/admin/console**', { timeout: 15_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
}

// ---------------------------------------------------------------------------
// Owner flows
// ---------------------------------------------------------------------------

test.describe('Admin console — Finance tab (owner)', { tag: '@auth' }, () => {
  test.use({ storageState: OWNER_STATE });

  test.beforeAll(async ({ browser }) => {
    await seedConsoleOwner();
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await loginAs(page, TEST_CONSOLE_OWNER_EMAIL, TEST_CONSOLE_OWNER_PASSWORD);
    await context.storageState({ path: OWNER_STATE });
    await context.close();
  });

  test.afterAll(async () => {
    await removeConsoleOwner();
  });

  test('owner sees the Finance tab and the cash-basis P&L table', async ({ page }) => {
    await mockFinance(page, { summary: SUMMARY_BANK_FIXTURE, plaidStatus: PLAID_STATUS_CONNECTED });

    const finance = new AdminFinancePage(page);
    await finance.open();

    // The tab is visible only for owners (client-side), and the panel loads.
    await expect(finance.financeTab).toBeVisible();
    await expect(finance.plTable).toBeVisible();
    await expect(finance.bankEmpty).toBeHidden();

    // Headline P&L is cash basis: Month | Bank income | Bank expenses | Profit.
    await expect(finance.plTableBody).toContainText('Sep 2026');
    await expect(finance.plTableBody).toContainText('$1,200.00'); // bank income
    await expect(finance.plTableBody).toContainText('$450.00'); // bank expenses
    await expect(finance.profitCell('2026-09')).toHaveText('$750.00');
    await expect(finance.profitCell('2026-08')).toHaveText('$580.00');

    // Earned-revenue complement: Stripe / IAP gross / IAP net.
    await expect(finance.earnedTable).toBeVisible();
    await expect(finance.earnedTableBody).toContainText('$200.00'); // Stripe
    await expect(finance.earnedTableBody).toContainText('$100.00'); // IAP gross
    await expect(finance.earnedTableBody).toContainText('$70.00'); // IAP net

    // Source badges reflect connectivity from the latest month.
    await expect(finance.sources).toContainText('Stripe: Connected');
    await expect(finance.sources).toContainText('Bank: Connected');

    // Warnings surface.
    await expect(page.locator('#finWarnings')).toContainText('could not be categorized');

    // Charts are wired to the bank series.
    await expect(page.locator('#chart-fin-income-svg path')).not.toHaveCount(0);
    await expect(page.locator('#chart-fin-expenses-svg path')).not.toHaveCount(0);
    await expect(page.locator('#chart-fin-income-total')).toHaveText('$2,100.00');

    // Bank status card: accounts + last sync.
    await expect(finance.plaidStatus).toContainText('Bank connected.');
    await expect(finance.plaidAccounts).toContainText('Business Checking');
    await expect(finance.plaidAccounts).toContainText('1234');
    await expect(finance.plaidLastSync).toContainText('Last synced:');
  });

  test('owner sees the connect-bank empty state when no bank is connected', async ({ page }) => {
    await mockFinance(page, {
      summary: SUMMARY_NO_BANK_FIXTURE,
      plaidStatus: PLAID_STATUS_DISCONNECTED,
    });

    const finance = new AdminFinancePage(page);
    await finance.open();

    // Empty state explains what is missing.
    await expect(finance.bankEmpty).toBeVisible();
    await expect(finance.bankEmpty).toContainText('Connect your bank to see expenses and true profit');

    // Income shows subscription earned revenue only, expenses are 0.
    await expect(finance.plTableBody).toContainText('$300.00');
    await expect(finance.plTableBody).toContainText('$0.00');
    await expect(finance.profitCell('2026-09')).toHaveText('$300.00');

    await expect(finance.sources).toContainText('Bank: Not connected');
    await expect(finance.plaidStatus).toContainText('No bank connected yet.');
  });

  test('owner sees a clear error when the API session is missing', async ({ page }) => {
    await mockFinance(page, {
      summaryStatus: 401,
      summary: { message: 'API session not established. Please log out and log in again.' },
    });

    const finance = new AdminFinancePage(page);
    await finance.open();

    await expect(finance.errorBox).toBeVisible();
    await expect(finance.errorBox).toContainText('API session not established');
  });

  test('owner can connect a bank via Plaid Link and sees the access token once', async ({ page }) => {
    let exchangedBody: unknown = null;
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      plaidStatus: PLAID_STATUS_CONNECTED,
      onLinkToken: () => ({ link_token: 'link-sandbox-test' }),
      onExchange: (body) => {
        exchangedBody = body;
        return { access_token: 'access-sandbox-shown-once' };
      },
    });

    const finance = new AdminFinancePage(page);
    await finance.open();

    // Stub Plaid Link (the real script loads from the Plaid CDN only when the
    // button is clicked; the stub skips that network load entirely).
    await page.evaluate(() => {
      const w = window as unknown as {
        __plaidCreateArgs?: { token: string; onSuccess: (t: string) => void };
        Plaid?: { create: (opts: unknown) => { open: () => void } };
      };
      w.Plaid = {
        create: (opts: unknown) => {
          w.__plaidCreateArgs = opts as { token: string; onSuccess: (t: string) => void };
          return { open: () => undefined };
        },
      };
    });

    await finance.plaidConnectBtn.click();

    // The page requested a link token and opened Link with it.
    await page.waitForFunction(
      () => !!(window as unknown as { __plaidCreateArgs?: unknown }).__plaidCreateArgs,
      null,
      { timeout: 10_000 }
    );
    const linkToken = await page.evaluate(
      () => (window as unknown as { __plaidCreateArgs: { token: string } }).__plaidCreateArgs.token
    );
    expect(linkToken).toBe('link-sandbox-test');

    // Simulate the user approving their bank in the Link iframe.
    await page.evaluate(() =>
      (window as unknown as { __plaidCreateArgs: { onSuccess: (t: string) => void } }).__plaidCreateArgs.onSuccess('public-token-abc')
    );

    // The public token is exchanged server-side, and the access token is
    // shown once with instructions to set the Heroku config var.
    expect(exchangedBody).toMatchObject({ public_token: 'public-token-abc' });
    await expect(finance.plaidToken).toBeVisible();
    await expect(finance.plaidToken).toContainText('access-sandbox-shown-once');
    await expect(finance.plaidToken).toContainText('PLAID_ACCESS_TOKEN');
  });

  test('owner can trigger a bank sync', async ({ page }) => {
    let syncCalls = 0;
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      plaidStatus: PLAID_STATUS_CONNECTED,
      onSync: () => {
        syncCalls += 1;
        return { ok: true };
      },
    });

    const finance = new AdminFinancePage(page);
    await finance.open();

    await finance.plaidSyncBtn.click();
    await expect.poll(() => syncCalls, { timeout: 10_000 }).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Non-owner staff: forbidden
// ---------------------------------------------------------------------------

test.describe('Admin console — Finance tab (non-owner staff)', { tag: '@auth' }, () => {
  test.use({ storageState: STAFF_STATE });

  test.beforeAll(async ({ browser }) => {
    await seedConsoleStaff();
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await loginAs(page, TEST_CONSOLE_STAFF_EMAIL, TEST_CONSOLE_STAFF_PASSWORD);
    await context.storageState({ path: STAFF_STATE });
    await context.close();
  });

  test.afterAll(async () => {
    await removeConsoleStaff();
  });

  test('staff does not see the Finance tab', async ({ page }) => {
    await page.goto('/admin/console');
    // Owner-only tabs stay display:none for staff — including Connect bank.
    await expect(page.locator('#finance-tab')).toBeHidden();
    await expect(page.locator('#panel-finance')).toBeHidden();
    await expect(page.getByTestId('finance-plaid-connect')).toBeHidden();
  });

  test('staff is forbidden from the finance proxy routes', async ({ page }) => {
    // These hit the REAL website proxies (no page.route mocks): the
    // server-side requireOwnerSession must reject them before any API call.
    const summary = await page.request.get('/admin/api/finance/summary?from=2026-09&to=2026-09');
    expect(summary.status()).toBe(403);

    const linkToken = await page.request.post('/admin/api/finance/plaid/link-token');
    expect(linkToken.status()).toBe(403);

    const exchange = await page.request.post('/admin/api/finance/plaid/exchange', {
      data: { public_token: 'public-sandbox-xyz' },
    });
    expect(exchange.status()).toBe(403);

    const sync = await page.request.post('/admin/api/finance/plaid/sync');
    expect(sync.status()).toBe(403);

    const status = await page.request.get('/admin/api/finance/plaid/status');
    expect(status.status()).toBe(403);

    // And an unauthenticated caller gets the same 403 (no session at all).
    const anonRequest = await playwrightRequest.newContext({
      baseURL: process.env.BASE_URL || 'http://localhost:8080',
    });
    const anonSummary = await anonRequest.get('/admin/api/finance/summary');
    expect(anonSummary.status()).toBe(403);
    const anonStatus = await anonRequest.get('/admin/api/finance/plaid/status');
    expect(anonStatus.status()).toBe(403);
    const anonLinkToken = await anonRequest.post('/admin/api/finance/plaid/link-token');
    expect(anonLinkToken.status()).toBe(403);
    await anonRequest.dispose();
  });
});

// ---------------------------------------------------------------------------
// API token leak regression: most-wanted.ejs must not render the token
// ---------------------------------------------------------------------------

test.describe('Most Wanted — no API token rendered client-side', () => {
  // Default chromium project storageState: the regular test user (admin
  // console sessions are NOT passport sessions, so the owner state above
  // cannot open /most-wanted).
  test('rendered page contains no trace of POLICE_CAD_API_TOKEN', async ({ page }) => {
    const encoded = encodeIdForUrl(TEST_COMMUNITY_ID);
    await page.goto(`/most-wanted?c=${encoded}`);

    // The page actually rendered (not a redirect to /communities or /login).
    await expect(page).toHaveURL(/most-wanted/);
    await expect(page.locator('#mw-entries')).toBeAttached({ timeout: 10_000 });

    const html = await page.content();
    expect(html).not.toContain('var apiToken');
    expect(html).not.toContain('POLICE_CAD_API_TOKEN');
    // The real configured value must not appear anywhere either.
    const token = process.env.POLICE_CAD_API_TOKEN;
    if (token) {
      expect(html).not.toContain(token);
    }
    // Client calls now go through the same-origin proxy.
    expect(html).toContain('/mw/api/');
  });
});
