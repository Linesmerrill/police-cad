/**
 * Owner-only Finance P&L dashboard (admin console "Finance" tab).
 *
 * Covers:
 *  - owner sees the Finance tab and the monthly P&L table (summary mocked at
 *    the website proxy level: /admin/api/finance/*);
 *  - expense add / edit / delete flows against the proxy CRUD routes;
 *  - the AdSense "Connect" button opens the OAuth URL from oauth/start;
 *  - a non-owner admin neither sees the Finance tab nor reaches the proxy
 *    routes (403 — server-side requireOwnerSession);
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

const SUMMARY_FIXTURE = {
  months: [
    {
      month: '2026-08',
      income: { stripe: 100, iap_gross: 50, iap_net: 35, adsense: 0, admob: 0, total: 135 },
      expenses: 40,
      profit: 95,
      sources: {
        stripe: { connected: true },
        revenuecat: { connected: true },
        adsense: { connected: false },
        admob: { connected: false },
      },
    },
    {
      month: '2026-09',
      income: { stripe: 200, iap_gross: 100, iap_net: 70, adsense: 0, admob: 0, total: 270 },
      expenses: 60,
      profit: 210,
      sources: {
        stripe: { connected: true },
        revenuecat: { connected: true },
        adsense: { connected: false },
        admob: { connected: false },
      },
    },
  ],
  warnings: ['AdSense is not connected — ad revenue shows $0.00.'],
};

const EXPENSE_ID = '60f6a1b2c3d4e5f60718293a';
const EXPENSE_FIXTURE = {
  expenses: [
    {
      id: EXPENSE_ID,
      date: '2026-09-15',
      amount: 49.99,
      currency: 'USD',
      category: 'hosting',
      vendor: 'Heroku',
      notes: 'dyno hours',
      source: 'manual',
      createdBy: 'console-owner@test.com',
      createdAt: '2026-09-15T12:00:00.000Z',
    },
  ],
  total: 49.99,
};

interface ExpenseMocks {
  summary?: unknown;
  summaryStatus?: number;
  list?: unknown;
  onPost?: (body: unknown) => unknown;
  onPut?: (id: string, body: unknown) => unknown;
  onDelete?: (id: string) => unknown;
  oauthUrl?: string;
}

/**
 * Single dispatching mock for /admin/api/finance*. One handler avoids
 * Playwright's last-registered-wins precedence and the
 * continue()-vs-fallback() footgun when several mocks share a URL prefix.
 */
async function mockFinance(page: Page, mocks: ExpenseMocks = {}) {
  const listBody = mocks.list === undefined ? EXPENSE_FIXTURE : mocks.list;
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
    if (method === 'GET' && path === '/admin/api/finance/expenses') {
      return json(200, listBody);
    }
    if (method === 'POST' && path === '/admin/api/finance/expenses' && mocks.onPost) {
      const created = mocks.onPost(req.postDataJSON());
      return json(201, created);
    }
    const idMatch = path.match(/^\/admin\/api\/finance\/expenses\/([a-f0-9]{24})$/i);
    if (idMatch && method === 'PUT' && mocks.onPut) {
      return json(200, mocks.onPut(idMatch[1], req.postDataJSON()));
    }
    if (idMatch && method === 'DELETE' && mocks.onDelete) {
      return json(200, mocks.onDelete(idMatch[1]));
    }
    if (method === 'GET' && path === '/admin/api/finance/adsense/oauth/start' && mocks.oauthUrl) {
      return json(200, { url: mocks.oauthUrl });
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

  test('owner sees the Finance tab and the monthly P&L table', async ({ page }) => {
    await mockFinance(page, { summary: SUMMARY_FIXTURE, list: { expenses: [], total: 0 } });

    const finance = new AdminFinancePage(page);
    await finance.open();

    // The tab is visible only for owners (client-side), and the panel loads.
    await expect(finance.financeTab).toBeVisible();
    await expect(finance.plTable).toBeVisible();

    // Table renders both fixture months with exact money formatting.
    await expect(finance.plTableBody).toContainText('Sep 2026');
    await expect(finance.plTableBody).toContainText('$200.00');
    await expect(finance.plTableBody).toContainText('$100.00'); // IAP gross
    await expect(finance.plTableBody).toContainText('$70.00'); // IAP net
    await expect(finance.plTableBody).toContainText('$270.00'); // total income
    await expect(finance.plTableBody).toContainText('$60.00'); // expenses
    await expect(finance.profitCell('2026-09')).toHaveText('$210.00');
    await expect(finance.profitCell('2026-08')).toHaveText('$95.00');

    // Source badges reflect connectivity from the latest month.
    await expect(finance.sources).toContainText('Stripe: Connected');
    await expect(finance.sources).toContainText('AdSense: Not connected');

    // Warnings surface.
    await expect(page.locator('#finWarnings')).toContainText('AdSense is not connected');

    // Charts rendered through the console's shared SVG chart helper.
    await expect(page.locator('#chart-fin-income-svg path')).not.toHaveCount(0);
    await expect(page.locator('#chart-fin-expenses-svg path')).not.toHaveCount(0);
    await expect(page.locator('#chart-fin-income-total')).toHaveText('$405.00');
  });

  test('owner sees a clear error when the API session is missing', async ({ page }) => {
    await mockFinance(page, {
      summaryStatus: 401,
      summary: { message: 'API session not established. Please log out and log in again.' },
      list: { expenses: [], total: 0 },
    });

    const finance = new AdminFinancePage(page);
    await finance.open();

    await expect(finance.errorBox).toBeVisible();
    await expect(finance.errorBox).toContainText('API session not established');
  });

  test('owner can add an expense', async ({ page }) => {
    let postedBody: unknown = null;
    await mockFinance(page, {
      summary: SUMMARY_FIXTURE,
      list: { expenses: [], total: 0 },
      onPost: (body) => {
        postedBody = body;
        return {
          id: 'new-expense-id',
          date: '2026-09-20',
          amount: 12.5,
          currency: 'USD',
          category: 'tools',
          vendor: '',
          notes: '',
          source: 'manual',
        };
      },
    });

    const finance = new AdminFinancePage(page);
    await finance.open();

    await finance.expenseDate.fill('2026-09-20');
    await finance.expenseAmount.fill('12.50');
    await finance.expenseCategory.fill('tools');
    await finance.expenseSubmit.click();

    // The proxy receives exactly the whitelisted payload shape.
    expect(postedBody).toMatchObject({
      date: '2026-09-20',
      amount: 12.5,
      category: 'tools',
      source: 'manual',
    });
    // The form resets after a successful save.
    await expect(finance.expenseAmount).toHaveValue('');
  });

  test('owner can edit an expense', async ({ page }) => {
    let putId = '';
    let putBody: unknown = null;
    await mockFinance(page, {
      summary: SUMMARY_FIXTURE,
      onPut: (id, body) => {
        putId = id;
        putBody = body;
        return { id };
      },
    });

    const finance = new AdminFinancePage(page);
    await finance.open();
    await expect(finance.expenseRow(EXPENSE_ID)).toBeVisible();

    // Edit pre-fills the form from the row.
    await page.getByTestId(`finance-expense-edit-${EXPENSE_ID}`).click();
    await expect(finance.expenseCategory).toHaveValue('hosting');
    await expect(finance.expenseAmount).toHaveValue('49.99');
    await expect(finance.expenseSubmit).toContainText('Save changes');

    await finance.expenseAmount.fill('59.99');
    await finance.expenseSubmit.click();

    expect(putId).toBe(EXPENSE_ID);
    expect(putBody).toMatchObject({ amount: 59.99, category: 'hosting' });
  });

  test('owner can delete an expense', async ({ page }) => {
    let deletedId = '';
    await mockFinance(page, {
      summary: SUMMARY_FIXTURE,
      onDelete: (id) => {
        deletedId = id;
        return { ok: true };
      },
    });
    page.on('dialog', (dialog) => dialog.accept());

    const finance = new AdminFinancePage(page);
    await finance.open();
    await expect(finance.expenseRow(EXPENSE_ID)).toBeVisible();

    await page.getByTestId(`finance-expense-delete-${EXPENSE_ID}`).click();

    expect(deletedId).toBe(EXPENSE_ID);
  });

  test('Connect AdSense opens the OAuth URL in a new tab', async ({ page }) => {
    const oauthUrl = 'https://accounts.google.com/o/oauth2/auth?test=finance';
    await mockFinance(page, {
      summary: SUMMARY_FIXTURE,
      list: { expenses: [], total: 0 },
      oauthUrl,
    });

    const finance = new AdminFinancePage(page);
    await finance.open();

    // Stub window.open to capture the URL instead of opening a tab.
    await page.evaluate(() => {
      (window as unknown as { __openedUrls: string[] }).__openedUrls = [];
      window.open = (url?: string | URL | null) => {
        (window as unknown as { __openedUrls: string[] }).__openedUrls.push(String(url));
        return null;
      };
    });
    await finance.adsenseConnectBtn.click();

    const opened = await page.evaluate(
      () => (window as unknown as { __openedUrls: string[] }).__openedUrls
    );
    expect(opened).toEqual([oauthUrl]);

    // Badge copy reflects the not-connected fixture.
    await expect(finance.adsenseStatus).toContainText('AdSense is not connected');
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
    // Owner-only tabs stay display:none for staff.
    await expect(page.locator('#finance-tab')).toBeHidden();
    await expect(page.locator('#panel-finance')).toBeHidden();
  });

  test('staff is forbidden from the finance proxy routes', async ({ page }) => {
    // These hit the REAL website proxies (no page.route mocks): the
    // server-side requireOwnerSession must reject them before any API call.
    const summary = await page.request.get('/admin/api/finance/summary?from=2026-09&to=2026-09');
    expect(summary.status()).toBe(403);

    const expensesGet = await page.request.get('/admin/api/finance/expenses');
    expect(expensesGet.status()).toBe(403);

    const expensesPost = await page.request.post('/admin/api/finance/expenses', {
      data: { date: '2026-09-01', amount: 1, category: 'x' },
    });
    expect(expensesPost.status()).toBe(403);

    const expensesPut = await page.request.put(`/admin/api/finance/expenses/${EXPENSE_ID}`, {
      data: { date: '2026-09-01', amount: 1, category: 'x' },
    });
    expect(expensesPut.status()).toBe(403);

    const expensesDelete = await page.request.delete(`/admin/api/finance/expenses/${EXPENSE_ID}`);
    expect(expensesDelete.status()).toBe(403);

    const oauthStart = await page.request.get('/admin/api/finance/adsense/oauth/start');
    expect(oauthStart.status()).toBe(403);

    // And an unauthenticated caller gets the same 403 (no session at all).
    const anonRequest = await playwrightRequest.newContext({
      baseURL: process.env.BASE_URL || 'http://localhost:8080',
    });
    const anon = await anonRequest.get('/admin/api/finance/summary');
    expect(anon.status()).toBe(403);
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
