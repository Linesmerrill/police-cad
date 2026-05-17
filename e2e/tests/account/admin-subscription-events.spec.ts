import { test, expect, Page } from '@playwright/test';
import {
  seedConsoleAdmin,
  removeConsoleAdmin,
  TEST_CONSOLE_ADMIN_EMAIL,
  TEST_CONSOLE_ADMIN_PASSWORD,
} from '../../helpers/admin-users';

// /admin/console is gated by req.session.adminToken (set only by a real
// POST /admin login — distinct from the regular user/passport session;
// see app/routes.js requireAdminSession). So we can't piggyback on the
// shared user.json storageState. Each test logs in as a seeded admin
// (real bcrypt-hashed password) before driving the panel.
//
// API endpoints (GET /api/v1/admin/subscription/users and detail) are
// still mocked with page.route — the test exercises panel rendering,
// not the API.
test.use({ storageState: { cookies: [], origins: [] } });

async function loginAsConsoleAdmin(page: Page) {
  await page.goto('/admin');
  await page.locator('input[name="email"]').fill(TEST_CONSOLE_ADMIN_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_CONSOLE_ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL('**/admin/console**', { timeout: 15_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
}

const MOCK_USER = {
  userId: '5e8adfd6e18b510004e2cbff',
  email: 'jaseysbro@example.com',
  username: 'jaseysbro',
  dbPlan: 'free',
  dbActive: false,
  dbSource: '',
  lastEventAt: '2026-05-16T12:00:00Z',
};

const MOCK_DETAIL = {
  user: {
    id: MOCK_USER.userId,
    email: MOCK_USER.email,
    username: MOCK_USER.username,
    subscription: {
      plan: 'free',
      active: false,
      source: '',
      id: '',
      stripeCustomerId: '',
      isAnnual: false,
      currentPeriodEnd: null,
      expirationDate: '',
      cancelAt: null,
      createdAt: '2026-03-14T22:48:33Z',
      updatedAt: '2026-05-16T12:00:00Z',
    },
  },
  authoritative: {
    status: 'active',
    source: 'revenuecat',
    plan: 'premium_plus',
    isAnnual: false,
    store: 'PLAY_STORE',
    productId: 'premium_plus_monthly',
    subscriptionId: 'GPA.3377-7617-2106-59661..0',
    purchasedAt: '2026-03-14T22:48:33Z',
    expiresAt: '2026-06-14T22:48:33Z',
    priceUsd: 19.99,
    currency: 'USD',
  },
  mismatch: {
    hasMismatch: true,
    summary: 'DB out of sync with revenuecat — plan: free → premium_plus, active: false → true',
    fields: [
      { field: 'plan', authoritative: 'premium_plus', db: 'free' },
      { field: 'active', authoritative: true, db: false },
    ],
  },
  payments: [
    {
      date: '2026-05-14T22:48:33Z',
      amount: 19.99,
      currency: 'USD',
      status: 'paid',
      source: 'stripe',
      reference: 'in_1Tw...abc',
      plan: 'premium_plus',
    },
    {
      date: '2026-04-14T22:48:33Z',
      amount: 19.99,
      currency: 'USD',
      status: 'paid',
      source: 'stripe',
      reference: 'in_1Tv...xyz',
      plan: 'premium_plus',
    },
  ],
  rawSources: { revenuecat: null, stripe: null },
};

test.describe('Admin → Subscriptions panel', { tag: '@admin' }, () => {
  test.beforeAll(async () => {
    await seedConsoleAdmin();
  });

  test.afterAll(async () => {
    await removeConsoleAdmin();
  });

  test.beforeEach(async ({ page }) => {
    await loginAsConsoleAdmin(page);
  });

  test('search → result list shows matching users', async ({ page }) => {
    let lastSearchQ: string | null = null;
    // Use `**` (not `*`) so the detail/sync URLs that include `/<userId>`
// also match — single `*` doesn't cross path separators.
await page.route('**/api/v1/admin/subscription/users**', async (route) => {
      const u = new URL(route.request().url());
      // Only match the search endpoint, not the per-user detail.
      if (u.pathname.endsWith('/admin/subscription/users')) {
        lastSearchQ = u.searchParams.get('q');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [MOCK_USER] }),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto('/admin/console#subscriptions');
    await page.locator('[data-panel="subscriptions"]').first().click();

    const search = page.getByTestId('subs-search-input');
    await search.fill('jasey');

    // Wait until our mock fires.
    await expect.poll(() => lastSearchQ).toBe('jasey');

    const results = page.getByTestId('subs-results');
    await expect(results.getByTestId('subs-result').first()).toBeVisible();
    await expect(results).toContainText('jaseysbro@example.com');
    await expect(results).toContainText('FREE');
  });

  test('clicking a result loads detail with mismatch banner + payment timeline', async ({ page }) => {
    // Use `**` (not `*`) so the detail/sync URLs that include `/<userId>`
// also match — single `*` doesn't cross path separators.
await page.route('**/api/v1/admin/subscription/users**', async (route) => {
      const u = new URL(route.request().url());
      if (u.pathname.endsWith('/admin/subscription/users')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [MOCK_USER] }),
        });
        return;
      }
      // Per-user detail
      if (u.pathname.endsWith('/admin/subscription/users/' + MOCK_USER.userId)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_DETAIL),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto('/admin/console#subscriptions');
    await page.locator('[data-panel="subscriptions"]').first().click();

    await page.getByTestId('subs-search-input').fill('jasey');
    await page.getByTestId('subs-result').first().click();

    // Mismatch banner with Fix button
    const fix = page.getByTestId('subs-fix-btn');
    await expect(fix).toBeVisible();
    await expect(fix).toContainText(/Fix in DB/);

    // Detail pane shows both DB plan and authoritative plan
    const detail = page.getByTestId('subs-detail');
    await expect(detail).toContainText('Our database');
    await expect(detail).toContainText(/Live.*revenuecat/i);
    await expect(detail).toContainText('premium_plus');

    // Payment timeline rendered with two paid rows
    const timeline = page.getByTestId('subs-timeline');
    await expect(timeline).toContainText('May 2026');
    await expect(timeline).toContainText('April 2026');
    await expect(timeline).toContainText('$19.99');
  });

  test('Fix in DB triggers sync POST and re-fetches detail', async ({ page }) => {
    let syncCalls = 0;
    let detailCalls = 0;
    let inSyncAfterFix = false;

    // Use `**` (not `*`) so the detail/sync URLs that include `/<userId>`
// also match — single `*` doesn't cross path separators.
await page.route('**/api/v1/admin/subscription/users**', async (route) => {
      const u = new URL(route.request().url());
      const isSync = u.pathname.endsWith('/sync') && route.request().method() === 'POST';
      const isDetail = u.pathname.endsWith('/admin/subscription/users/' + MOCK_USER.userId) && !isSync;

      if (u.pathname.endsWith('/admin/subscription/users') && route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [MOCK_USER] }),
        });
        return;
      }
      if (isSync) {
        syncCalls++;
        inSyncAfterFix = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, syncedFrom: 'revenuecat', authoritative: MOCK_DETAIL.authoritative }),
        });
        return;
      }
      if (isDetail) {
        detailCalls++;
        const body = inSyncAfterFix
          ? { ...MOCK_DETAIL, mismatch: { hasMismatch: false, summary: '', fields: [] } }
          : MOCK_DETAIL;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(body),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto('/admin/console#subscriptions');
    await page.locator('[data-panel="subscriptions"]').first().click();

    await page.getByTestId('subs-search-input').fill('jasey');
    await page.getByTestId('subs-result').first().click();

    await page.getByTestId('subs-fix-btn').click();

    await expect.poll(() => syncCalls).toBe(1);
    // Banner flips to OK once the post-sync detail re-fetch lands.
    await expect(page.getByTestId('subs-detail')).toContainText(/In sync/);
  });
});
