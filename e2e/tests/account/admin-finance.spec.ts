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
  seedDeactivatedAdmin,
  removeDeactivatedAdmin,
  TEST_DEACTIVATED_ADMIN_EMAIL,
  TEST_DEACTIVATED_ADMIN_PASSWORD,
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
  sources: {
    stripe: { connected: true, events: 3 },
    revenuecat: { connected: false },
    bank: { connected: true },
  },
  by_tag: {
    income: [
      { tag_id: 'aaaaaaaaaaaaaaaaaaaaaaa1', name: 'Steam', color: '#38bdf8', amount: 1500 },
      { tag_id: '', name: 'Untagged', color: '#64748b', amount: 600 },
    ],
    expenses: [
      { tag_id: 'aaaaaaaaaaaaaaaaaaaaaaa2', name: 'Google Ads', color: '#fbbf24', amount: 500 },
      { tag_id: '', name: 'Untagged', color: '#64748b', amount: 270 },
    ],
  },
  warnings: ['One bank transaction could not be categorized.'],
};

const TAGS_FIXTURE = {
  tags: [
    { _id: 'aaaaaaaaaaaaaaaaaaaaaaa1', name: 'Steam', color: '#38bdf8' },
    { _id: 'aaaaaaaaaaaaaaaaaaaaaaa2', name: 'Google Ads', color: '#fbbf24' },
  ],
};

const TRANSACTIONS_FIXTURE = {
  data: [
    {
      transaction_id: 'tx-steam-1', account_name: 'Business Checking', account_mask: '1234',
      name: 'STEAM PAYOUT 8812', merchant_name: 'Steam', amount: -500, date: '2026-09-12T00:00:00Z',
      pending: false, hidden: false, tag_id: 'aaaaaaaaaaaaaaaaaaaaaaa1', internal_transfer: false,
    },
    {
      transaction_id: 'tx-heroku-1', account_name: 'Business Checking', account_mask: '1234',
      name: 'HEROKU*BILLING', merchant_name: 'Heroku', amount: 85.5, date: '2026-09-10T00:00:00Z',
      pending: false, hidden: false, internal_transfer: false,
    },
  ],
  totalCount: 2,
  page: 1,
  limit: 25,
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

// Synced just now, so opening Finance doesn't trigger the automatic sync.
const PLAID_STATUS_CONNECTED = {
  connected: true,
  last_sync: new Date().toISOString(),
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
  onSummary?: (url: URL) => void;
  plaidStatus?: unknown;
  onPatchTransaction?: (id: string, body: unknown) => void;
  onCreateTag?: (body: unknown) => void;
  onPatchTag?: (id: string, body: unknown) => void;
  onLinkToken?: (body: unknown) => unknown;
  onUpdateComplete?: () => unknown;
  onSandboxWebhook?: (body: unknown) => void;
  onDisconnect?: (body: unknown) => unknown;
  onExchange?: (body: unknown) => unknown;
  onSync?: () => unknown;
  /** GET /admin/api/mfa. Defaults to two-factor on and passed this session. */
  mfa?: unknown;
  onMfaEnable?: (body: { code?: string }) => { status: number; body: unknown };
}

const MFA_VERIFIED = { enabled: true, sessionVerified: true, backupCodesRemaining: 10 };

/**
 * Single dispatching mock for /admin/api/finance*. One handler avoids
 * Playwright's last-registered-wins precedence and the
 * continue()-vs-fallback() footgun when several mocks share a URL prefix.
 */
async function mockFinance(page: Page, mocks: FinanceMocks = {}) {
  const plaidStatus = mocks.plaidStatus === undefined ? PLAID_STATUS_DISCONNECTED : mocks.plaidStatus;
  await page.route('**/admin/api/mfa**', (route: Route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'GET' && path === '/admin/api/mfa') {
      return json(200, mocks.mfa === undefined ? MFA_VERIFIED : mocks.mfa);
    }
    if (req.method() === 'POST' && path === '/admin/api/mfa/setup') {
      return json(200, {
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl: 'otpauth://totp/test',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      });
    }
    if (req.method() === 'POST' && path === '/admin/api/mfa/enable' && mocks.onMfaEnable) {
      const result = mocks.onMfaEnable(req.postDataJSON());
      return json(result.status, result.body);
    }
    return route.fallback();
  });
  await page.route('**/admin/api/finance/**', (route: Route) => {
    const req = route.request();
    const method = req.method();
    const url = new URL(req.url());
    const path = url.pathname;
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (method === 'GET' && path === '/admin/api/finance/summary') {
      if (mocks.onSummary) mocks.onSummary(url);
      if (mocks.summary !== undefined) {
        return json(mocks.summaryStatus || 200, mocks.summary);
      }
      return route.fallback();
    }
    if (method === 'GET' && path === '/admin/api/finance/tags') {
      return json(200, TAGS_FIXTURE);
    }
    if (method === 'POST' && path === '/admin/api/finance/tags') {
      const body = req.postDataJSON();
      if (mocks.onCreateTag) mocks.onCreateTag(body);
      return json(201, { tag: { _id: 'aaaaaaaaaaaaaaaaaaaaaaa9', name: body.name, color: body.color || '#38bdf8' } });
    }
    if (method === 'PATCH' && path.startsWith('/admin/api/finance/tags/')) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      if (mocks.onPatchTag) mocks.onPatchTag(id, req.postDataJSON());
      return json(200, { tag: {} });
    }
    if (method === 'GET' && path === '/admin/api/finance/tag-rules') {
      return json(200, { rules: [] });
    }
    if (method === 'GET' && path === '/admin/api/finance/transactions') {
      return json(200, TRANSACTIONS_FIXTURE);
    }
    if (method === 'PATCH' && path.startsWith('/admin/api/finance/transactions/')) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      if (mocks.onPatchTransaction) mocks.onPatchTransaction(id, req.postDataJSON());
      return json(200, { transaction: {}, also_tagged: 0 });
    }
    if (method === 'GET' && path === '/admin/api/finance/plaid/status') {
      return json(200, plaidStatus);
    }
    if (method === 'POST' && path === '/admin/api/finance/plaid/link-token') {
      const body = req.postData() ? req.postDataJSON() : {};
      return json(200, mocks.onLinkToken ? mocks.onLinkToken(body) : { link_token: 'link-sandbox-test' });
    }
    if (method === 'POST' && path === '/admin/api/finance/plaid/update-complete') {
      const out = mocks.onUpdateComplete ? mocks.onUpdateComplete() : undefined;
      return json(200, out || { status: 'ok' });
    }
    if (method === 'POST' && path === '/admin/api/finance/plaid/disconnect') {
      const body = req.postDataJSON();
      return json(200, mocks.onDisconnect ? mocks.onDisconnect(body) : { disconnected: true, deleted_transactions: 0 });
    }
    if (method === 'POST' && path === '/admin/api/finance/plaid/sandbox-webhook') {
      if (mocks.onSandboxWebhook) mocks.onSandboxWebhook(req.postDataJSON());
      return json(200, { status: 'fired' });
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

// Stub Plaid Link so no CDN load happens; captures Plaid.create's options.
async function stubPlaidLink(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as {
      __plaidCreateArgs?: unknown;
      Plaid?: { create: (opts: unknown) => { open: () => void } };
    };
    w.__plaidCreateArgs = undefined;
    w.Plaid = {
      create: (opts: unknown) => {
        w.__plaidCreateArgs = opts;
        return { open: () => undefined };
      },
    };
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
    // Badges say what each source delivered, not just that it exists.
    await expect(finance.sources).toContainText('Stripe: 3 payments');
    await expect(finance.sources).toContainText('App stores: nothing received yet');
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
    // The exchange request goes out asynchronously after onSuccess, so wait
    // for it rather than checking straight away.
    await expect.poll(() => exchangedBody, { timeout: 10_000 }).toMatchObject({ public_token: 'public-token-abc' });
    await expect(finance.plaidToken).toBeVisible();
    await expect(finance.plaidToken).toContainText('access-sandbox-shown-once');
    await expect(finance.plaidToken).toContainText('PLAID_ACCESS_TOKEN');
  });

  test('a broken connection offers Fix connection, which repairs it in update mode', async ({ page }) => {
    const linkBodies: unknown[] = [];
    let completed = 0;
    let status: Record<string, unknown> = { ...PLAID_STATUS_CONNECTED, item_status: 'login_required' };
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      onLinkToken: (body) => { linkBodies.push(body); return { link_token: 'link-update' }; },
      onUpdateComplete: () => { completed += 1; status = { ...PLAID_STATUS_CONNECTED, item_status: 'ok' }; },
    });
    // Status changes once the repair completes, so serve it from a variable.
    await page.route('**/admin/api/finance/plaid/status', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(status) }));

    const finance = new AdminFinancePage(page);
    await finance.open();
    await stubPlaidLink(page);

    const alert = page.getByTestId('finance-bank-alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('sign in again');
    await expect(finance.plaidStatus).toHaveText('Bank needs attention.');

    await page.getByTestId('finance-plaid-fix').click();
    await page.waitForFunction(() => !!(window as unknown as { __plaidCreateArgs?: unknown }).__plaidCreateArgs);
    expect(linkBodies).toEqual([{ mode: 'update' }]);

    await page.evaluate(() =>
      (window as unknown as { __plaidCreateArgs: { onSuccess: () => void } }).__plaidCreateArgs.onSuccess());
    await expect.poll(() => completed).toBe(1);
    await expect(alert).toBeHidden();
    await expect(finance.plaidStatus).toHaveText('Bank connected.');
  });

  test('new accounts at the bank offer Add accounts with account selection', async ({ page }) => {
    const linkBodies: unknown[] = [];
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      plaidStatus: { ...PLAID_STATUS_CONNECTED, item_status: 'ok', new_accounts_available: true },
      onLinkToken: (body) => { linkBodies.push(body); return { link_token: 'link-accounts' }; },
    });
    const finance = new AdminFinancePage(page);
    await finance.open();
    await stubPlaidLink(page);

    await expect(page.getByTestId('finance-bank-alert')).toContainText('New accounts are available');
    // Not broken, so the dot stays green and the status reads connected.
    await expect(finance.plaidStatus).toHaveText('Bank connected.');
    await page.getByTestId('finance-plaid-fix').click();
    await expect.poll(() => linkBodies).toEqual([{ mode: 'new_accounts' }]);
  });

  test('expiring access names the date; revoked access starts a new connection', async ({ page }) => {
    const linkBodies: unknown[] = [];
    let status: Record<string, unknown> = { ...PLAID_STATUS_CONNECTED, item_status: 'pending_expiration', consent_expires_at: '2026-11-01T12:00:00Z' };
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      onLinkToken: (body) => { linkBodies.push(body); return { link_token: 'link-new' }; },
    });
    await page.route('**/admin/api/finance/plaid/status', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(status) }));
    const finance = new AdminFinancePage(page);
    await finance.open();

    const expected = await page.evaluate(() => new Date('2026-11-01T12:00:00Z').toLocaleDateString());
    await expect(page.getByTestId('finance-bank-alert')).toContainText(`expires ${expected}`);
    await expect(page.getByTestId('finance-plaid-fix')).toHaveText('Renew access');

    status = { ...PLAID_STATUS_CONNECTED, item_status: 'revoked' };
    await page.locator('#finRefreshBtn').click();
    await expect(page.getByTestId('finance-plaid-fix')).toHaveText('Connect bank');
    await stubPlaidLink(page);
    await page.getByTestId('finance-plaid-fix').click();
    // A revoked connection can't be repaired: a normal connect, no mode.
    await expect.poll(() => linkBodies).toEqual([{}]);
  });

  test('Sandbox shows a test webhook button that fires NEW_ACCOUNTS_AVAILABLE', async ({ page }) => {
    const fired: unknown[] = [];
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      plaidStatus: { ...PLAID_STATUS_CONNECTED, item_status: 'ok', sandbox: true },
      onSandboxWebhook: (body) => fired.push(body),
    });
    const finance = new AdminFinancePage(page);
    await finance.open();
    await page.locator('#finBankToggle').click();
    await page.getByTestId('finance-plaid-test-webhook').click();
    await expect.poll(() => fired).toEqual([{ code: 'NEW_ACCOUNTS_AVAILABLE' }]);
  });

  test('Disconnect bank removes the connection and deletes the data by default', async ({ page }) => {
    const bodies: unknown[] = [];
    let status: Record<string, unknown> = { ...PLAID_STATUS_CONNECTED, item_status: 'ok' };
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      onDisconnect: (body) => {
        bodies.push(body);
        status = { ...PLAID_STATUS_DISCONNECTED };
        return { disconnected: true, deleted_transactions: 48 };
      },
    });
    await page.route('**/admin/api/finance/plaid/status', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(status) }));
    const finance = new AdminFinancePage(page);
    await finance.open();
    await expect(finance.plaidStatus).toHaveText('Bank connected.');

    await page.locator('#finBankToggle').click();
    await page.getByTestId('finance-plaid-disconnect').click();
    await page.getByTestId('finance-plaid-disconnect-confirm').click();
    await expect.poll(() => bodies).toEqual([{ delete_data: true }]);
    await expect(finance.plaidStatus).toHaveText('No bank connected yet.');
    await expect(page.locator('#finBankSummary')).toContainText('48 transactions deleted');
  });

  test('Choose accounts opens account selection and reports removed transactions', async ({ page }) => {
    const linkBodies: unknown[] = [];
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      plaidStatus: { ...PLAID_STATUS_CONNECTED, item_status: 'ok' },
      onLinkToken: (body) => { linkBodies.push(body); return { link_token: 'link-choose' }; },
      onUpdateComplete: () => ({ status: 'ok', removed_transactions: 12 }),
    });
    const finance = new AdminFinancePage(page);
    await finance.open();
    await stubPlaidLink(page);
    await page.locator('#finBankToggle').click();
    await page.getByTestId('finance-plaid-choose-accounts').click();
    await page.waitForFunction(() => !!(window as unknown as { __plaidCreateArgs?: unknown }).__plaidCreateArgs);
    expect(linkBodies).toEqual([{ mode: 'new_accounts' }]);
    await page.evaluate(() =>
      (window as unknown as { __plaidCreateArgs: { onSuccess: () => void } }).__plaidCreateArgs.onSuccess());
    await expect(page.locator('#finBankSummary')).toContainText('12 transactions from unselected accounts removed');
  });

  test('Disconnect can keep the transactions', async ({ page }) => {
    const bodies: unknown[] = [];
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      plaidStatus: { ...PLAID_STATUS_CONNECTED, item_status: 'ok' },
      onDisconnect: (body) => { bodies.push(body); return { disconnected: true, deleted_transactions: 0 }; },
    });
    const finance = new AdminFinancePage(page);
    await finance.open();
    await page.locator('#finBankToggle').click();
    await page.getByTestId('finance-plaid-disconnect').click();
    await page.locator('#finPlaidDeleteData').uncheck();
    await page.getByTestId('finance-plaid-disconnect-confirm').click();
    await expect.poll(() => bodies).toEqual([{ delete_data: false }]);
  });

  test('production hides the test webhook button', async ({ page }) => {
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      plaidStatus: { ...PLAID_STATUS_CONNECTED, item_status: 'ok', sandbox: false },
    });
    const finance = new AdminFinancePage(page);
    await finance.open();
    await expect(finance.plaidStatus).toHaveText('Bank connected.');
    await expect(page.getByTestId('finance-plaid-test-webhook')).toBeHidden();
    await expect(page.getByTestId('finance-bank-alert')).toBeHidden();
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

  test('opening Finance syncs the bank once when the last sync is stale', async ({ page }) => {
    let syncCalls = 0;
    let summaryCalls = 0;
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      plaidStatus: { ...PLAID_STATUS_CONNECTED, last_sync: '2026-09-30T10:00:00Z' },
      onSummary: () => { summaryCalls += 1; },
      onSync: () => {
        syncCalls += 1;
        return { added: 2, modified: 0, removed: 0, has_more: false };
      },
    });

    const finance = new AdminFinancePage(page);
    await finance.open();

    await expect.poll(() => syncCalls, { timeout: 10_000 }).toBe(1);
    // New transactions arrived, so the totals reload after the sync.
    await expect.poll(() => summaryCalls, { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
    // The status still reads stale (static mock): no second sync this page load.
    await page.waitForTimeout(1500);
    expect(syncCalls).toBe(1);
  });

  test('opening Finance skips the sync when it ran recently', async ({ page }) => {
    let syncCalls = 0;
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      plaidStatus: PLAID_STATUS_CONNECTED,
      onSync: () => {
        syncCalls += 1;
        return { added: 0, modified: 0, removed: 0, has_more: false };
      },
    });

    const finance = new AdminFinancePage(page);
    await finance.open();
    await expect(finance.profitCell('2026-09')).toHaveText('$750.00');
    await page.waitForTimeout(1500);
    expect(syncCalls).toBe(0);
  });

  test('quick ranges set the months and reload', async ({ page }) => {
    const ranges: string[] = [];
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      plaidStatus: PLAID_STATUS_CONNECTED,
      onSummary: (url) => ranges.push(`${url.searchParams.get('from')}..${url.searchParams.get('to')}`),
    });
    const finance = new AdminFinancePage(page);
    await finance.open();

    const now = new Date();
    const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const thisMonth = ym(now);
    const threeBack = ym(new Date(now.getFullYear(), now.getMonth() - 2, 1));

    await finance.preset('3').click();
    await expect(page.getByTestId('finance-from')).toHaveValue(threeBack);
    await expect(page.getByTestId('finance-to')).toHaveValue(thisMonth);
    await expect(finance.preset('3')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => ranges).toContain(`${threeBack}..${thisMonth}`);

    await finance.preset('this-month').click();
    await expect(page.getByTestId('finance-from')).toHaveValue(thisMonth);
    await expect.poll(() => ranges).toContain(`${thisMonth}..${thisMonth}`);
  });

  test('the current month is hidden until it has data, past zeros stay', async ({ page }) => {
    const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = (d: Date) => d.toLocaleString('en-US', { month: 'short' }) + ' ' + d.getFullYear();
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const empty = (month: string) => ({
      month,
      income: { stripe: 0, iap_gross: 0, iap_net: 0, total: 0 },
      expenses: 0,
      profit: 0,
      bank: { connected: true, income: 0, expenses: 0 },
    });
    await mockFinance(page, {
      summary: { ...SUMMARY_BANK_FIXTURE, months: [empty(ym(lastMonth)), empty(ym(thisMonth))] },
      plaidStatus: PLAID_STATUS_CONNECTED,
    });

    const finance = new AdminFinancePage(page);
    await finance.open();

    // Last month really was $0: it stays.
    await expect(finance.profitCell(ym(lastMonth))).toHaveText('$0.00');
    await expect(finance.earnedTableBody).toContainText(label(lastMonth));
    // This month just hasn't had anything land yet: no row.
    await expect(finance.profitCell(ym(thisMonth))).toHaveCount(0);
    await expect(finance.earnedTableBody).not.toContainText(label(thisMonth));
  });

  test('a loss reads -$, not $-', async ({ page }) => {
    const losing = JSON.parse(JSON.stringify(SUMMARY_BANK_FIXTURE));
    losing.months[1].profit = -10645.24;
    await mockFinance(page, { summary: losing, plaidStatus: PLAID_STATUS_CONNECTED });
    const finance = new AdminFinancePage(page);
    await finance.open();

    await expect(finance.profitCell('2026-09')).toHaveText('-$10,645.24');
    await expect(page.getByTestId('finance-profit-total')).toHaveText('-$10,065.24');
  });

  test('the donuts show each tag from by_tag', async ({ page }) => {
    await mockFinance(page, { summary: SUMMARY_BANK_FIXTURE, plaidStatus: PLAID_STATUS_CONNECTED });
    const finance = new AdminFinancePage(page);
    await finance.open();

    const income = page.getByTestId('finance-pie-income');
    await expect(income.locator('svg path')).toHaveCount(2);
    await expect(income.locator('.fin-pie-legend')).toContainText('Steam');
    await expect(income.locator('.fin-pie-legend')).toContainText('$1,500.00');
    await expect(income.locator('.fin-pie-legend')).toContainText('71.4%');
    await expect(page.getByTestId('finance-pie-expenses').locator('.fin-pie-legend')).toContainText('Google Ads');
  });

  test('hiding a transaction sends hidden and reloads the totals', async ({ page }) => {
    const patches: Array<{ id: string; body: unknown }> = [];
    let summaries = 0;
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      plaidStatus: PLAID_STATUS_CONNECTED,
      onSummary: () => { summaries += 1; },
      onPatchTransaction: (id, body) => patches.push({ id, body }),
    });
    const finance = new AdminFinancePage(page);
    await finance.open();

    await expect(finance.txRows).toHaveCount(2);
    await expect(finance.txRows.first()).toContainText('Steam');
    const before = summaries;
    await page.getByRole('button', { name: 'Hide transaction' }).nth(1).click();

    await expect.poll(() => patches).toEqual([{ id: 'tx-heroku-1', body: { hidden: true } }]);
    await expect.poll(() => summaries).toBeGreaterThan(before);
  });

  // Regression: the modal sat inside the panel while Bootstrap's backdrop
  // went on <body>, so the backdrop covered it and nothing could be clicked.
  test('the tags modal can be used', async ({ page }) => {
    const created: unknown[] = [];
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      plaidStatus: PLAID_STATUS_CONNECTED,
      onCreateTag: (body) => created.push(body),
    });
    const finance = new AdminFinancePage(page);
    await finance.open();

    await page.getByTestId('finance-manage-tags').click();
    const modal = page.locator('#finTagsModal');
    await expect(modal).toBeVisible();
    // A real click: Playwright refuses it if another element covers the input.
    await page.getByTestId('finance-tag-add-name').click();
    await page.keyboard.type('Hosting');
    await page.keyboard.press('Enter');
    await expect.poll(() => created).toEqual([expect.objectContaining({ name: 'Hosting' })]);
  });

  test('tag colours: shuffle, presets and a typed hex', async ({ page }) => {
    const created: Array<{ name?: string; color?: string }> = [];
    const patched: Array<{ id: string; body: { color?: string } }> = [];
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      plaidStatus: PLAID_STATUS_CONNECTED,
      onCreateTag: (body) => created.push(body as { name?: string; color?: string }),
      onPatchTag: (id, body) => patched.push({ id, body: body as { color?: string } }),
    });
    const finance = new AdminFinancePage(page);
    await finance.open();
    await page.getByTestId('finance-manage-tags').click();

    const hex = page.getByTestId('finance-tag-add-color');
    const before = await hex.inputValue();
    expect(before).toMatch(/^#[0-9a-f]{6}$/);

    // Shuffle picks a new valid colour (retry: a random repeat is possible).
    await expect.poll(async () => {
      await page.getByTestId('finance-tag-shuffle').click();
      return hex.inputValue();
    }).not.toBe(before);
    await expect(hex).toHaveValue(/^#[0-9a-f]{6}$/);

    // A bad hex is flagged on the field and nothing is sent.
    await hex.fill('#12');
    await page.getByTestId('finance-tag-add-name').fill('Hosting');
    await page.getByTestId('finance-tag-add-name').press('Enter');
    await expect(hex).toHaveAttribute('aria-invalid', 'true');
    expect(created).toEqual([]);

    // Short hex is expanded, and the tag is created with it.
    await hex.fill('#0af');
    await page.getByTestId('finance-tag-add-name').press('Enter');
    await expect.poll(() => created).toEqual([{ name: 'Hosting', color: '#00aaff' }]);

    // An existing tag: focusing its row shows the presets; picking one saves.
    // Creating the tag above re-renders the list once its reload lands, which
    // can drop focus mid-click, so focus and pick together until it sticks.
    const steamRow = page.locator('#finTagsList .fin-tags-row').first();
    await expect(async () => {
      await steamRow.locator('.fin-hex').click();
      await steamRow.locator('[data-swatch="#a78bfa"]').click({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await expect.poll(() => patched, { timeout: 5_000 })
      .toEqual([{ id: 'aaaaaaaaaaaaaaaaaaaaaaa1', body: { color: '#a78bfa' } }]);
  });

  test('tagging a transaction can tag the whole merchant', async ({ page }) => {
    const patches: Array<{ id: string; body: unknown }> = [];
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      plaidStatus: PLAID_STATUS_CONNECTED,
      onPatchTransaction: (id, body) => patches.push({ id, body }),
    });
    const finance = new AdminFinancePage(page);
    await finance.open();

    // The Heroku row is untagged.
    await finance.txRows.nth(1).getByRole('button', { name: 'Add a tag' }).click();
    await expect(finance.tagPicker).toBeVisible();
    await finance.tagPicker.getByLabel(/Also tag future transactions from Heroku/).check();
    await finance.tagPicker.getByRole('button', { name: 'Google Ads' }).click();

    await expect.poll(() => patches).toEqual([
      { id: 'tx-heroku-1', body: { tag_id: 'aaaaaaaaaaaaaaaaaaaaaaa2', apply_to_merchant: true } },
    ]);
    await expect(finance.tagPicker).toBeHidden();
  });

  test('Finance stays locked until two-factor is set up', async ({ page }) => {
    let mfaState: unknown = { enabled: false, sessionVerified: false, backupCodesRemaining: 0 };
    const enableCodes: string[] = [];
    let summaryCalls = 0;
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      plaidStatus: PLAID_STATUS_CONNECTED,
      onSummary: () => { summaryCalls += 1; },
      onMfaEnable: (body) => {
        enableCodes.push(String(body.code));
        if (body.code !== '123456') {
          return { status: 401, body: { message: 'That code is not valid.', code: 'MFA_INVALID' } };
        }
        mfaState = MFA_VERIFIED;
        return { status: 200, body: { backupCodes: ['aaaaa-bbbbb', 'ccccc-ddddd'] } };
      },
    });
    // Status follows the setup: off until enable succeeds. Registered after
    // mockFinance, so it takes precedence for GET /admin/api/mfa.
    await page.route('**/admin/api/mfa', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mfaState) }));

    const finance = new AdminFinancePage(page);
    await finance.open();

    await expect(finance.mfaGate).toBeVisible();
    await expect(finance.mfaGate).toContainText('Turn on two-factor authentication');
    await expect(finance.plTable).toBeHidden();
    await expect(finance.plaidConnectBtn).toBeHidden();
    expect(summaryCalls).toBe(0);

    await page.getByTestId('finance-mfa-start').click();
    await expect(page.getByTestId('finance-mfa-secret')).toHaveText('JBSWY3DPEHPK3PXP');

    // A wrong code keeps the owner on the scan step with the reason.
    await page.getByTestId('finance-mfa-enable-code').fill('000000');
    await page.getByTestId('finance-mfa-enable').click();
    await expect(page.locator('#finMfaEnableMsg')).toContainText('not valid');

    await page.getByTestId('finance-mfa-enable-code').fill('123456');
    await page.getByTestId('finance-mfa-enable').click();
    await expect(page.getByTestId('finance-mfa-backup-codes')).toContainText('aaaaa-bbbbb');
    expect(enableCodes).toEqual(['000000', '123456']);

    await page.getByTestId('finance-mfa-done').click();
    await expect(finance.mfaGate).toBeHidden();
    await expect(finance.profitCell('2026-09')).toHaveText('$750.00');
    await expect(page.getByTestId('finance-mfa-settings')).toContainText('10 backup codes left');
  });

  test('a session without the code is asked to sign in again', async ({ page }) => {
    await mockFinance(page, {
      summary: SUMMARY_BANK_FIXTURE,
      mfa: { enabled: true, sessionVerified: false, backupCodesRemaining: 9 },
    });

    const finance = new AdminFinancePage(page);
    await finance.open();

    await expect(finance.mfaGate).toContainText('Sign in again with two-factor');
    await expect(finance.plTable).toBeHidden();
  });

  test('the two-factor code page needs a password step first', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/admin/mfa');
    await expect(page).toHaveURL(/\/admin\?error=/);
    await expect(page.locator('.alert-danger')).toContainText('sign-in expired');
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

    // Transactions, tags and rules are owner-only too.
    expect((await page.request.get('/admin/api/finance/transactions')).status()).toBe(403);
    expect((await page.request.patch('/admin/api/finance/transactions/tx-1', { data: { hidden: true } })).status()).toBe(403);
    expect((await page.request.get('/admin/api/finance/tags')).status()).toBe(403);
    expect((await page.request.post('/admin/api/finance/tags', { data: { name: 'Steam' } })).status()).toBe(403);
    expect((await page.request.delete('/admin/api/finance/tags/aaaaaaaaaaaaaaaaaaaaaaa1')).status()).toBe(403);
    expect((await page.request.get('/admin/api/finance/tag-rules')).status()).toBe(403);

    // Two-factor management is owner-only as well.
    expect((await page.request.get('/admin/api/mfa')).status()).toBe(403);
    expect((await page.request.post('/admin/api/mfa/setup')).status()).toBe(403);
    expect((await page.request.post('/admin/api/mfa/disable', { data: { code: '123456' } })).status()).toBe(403);

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

test.describe('Admin console — deactivated admins', () => {
  test.beforeAll(async () => { await seedDeactivatedAdmin(); });
  test.afterAll(async () => { await removeDeactivatedAdmin(); });

  test('a deactivated admin cannot sign in', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto('/admin');
    await page.locator('input[name="email"]').fill(TEST_DEACTIVATED_ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(TEST_DEACTIVATED_ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin\?error=/);
    await expect(page.locator('.alert-danger')).toContainText('Invalid credentials');
    await page.goto('/admin/console');
    await expect(page).toHaveURL(/\/admin(\?|$)/);
    await context.close();
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
