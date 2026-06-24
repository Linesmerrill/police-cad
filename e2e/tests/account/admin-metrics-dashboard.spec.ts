import { test, expect, Page } from '@playwright/test';
import {
  seedConsoleStaff,
  removeConsoleStaff,
  TEST_CONSOLE_STAFF_EMAIL,
  TEST_CONSOLE_STAFF_PASSWORD,
} from '../../helpers/admin-users';

// The performance dashboard (route latency, slow queries, charts) lives in the
// police-cad-api repo but the API gateway lockdown blocks direct browser access.
// We surface it through /admin/metrics: the HTML and its data calls are served
// + proxied by the website, gated behind requireAdminSession. These tests prove
// (1) the gate actually redirects unauthenticated callers and (2) the admin
// console links to the dashboard. We don't assert the dashboard's rendered
// contents — that depends on the API serving metrics-dashboard.html, which is
// exercised by the API repo, not here.
test.use({ storageState: { cookies: [], origins: [] } });

async function loginAsConsoleStaff(page: Page) {
  await page.goto('/admin');
  await page.locator('input[name="email"]').fill(TEST_CONSOLE_STAFF_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_CONSOLE_STAFF_PASSWORD);
  await Promise.all([
    page.waitForURL('**/admin/console**', { timeout: 15_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
}

test.describe('Admin → Performance dashboard access', { tag: '@admin' }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await seedConsoleStaff();
  });

  test.afterAll(async () => {
    await removeConsoleStaff();
  });

  test('redirects unauthenticated access to the dashboard page to /admin login', async ({ page }) => {
    await page.goto('/admin/metrics');
    await expect(page).toHaveURL(/\/admin(\?|$)/, { timeout: 10_000 });
  });

  test('redirects unauthenticated access to the data proxy to /admin login', async ({ request }) => {
    // The proxy must not leak metrics JSON to an unauthenticated caller; without
    // a session it should bounce to the login page rather than return data.
    const res = await request.get('/admin/metrics/api?since=1h', { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()['location']).toContain('/admin');
  });

  test('admin console links to the performance dashboard', async ({ page }) => {
    await loginAsConsoleStaff(page);

    // Open the Metrics panel where the link lives.
    await page.locator('.ac-nav-item[data-panel="metrics"]').click();

    const dashLink = page.getByRole('link', { name: /Open Performance Dashboard/i });
    await expect(dashLink).toBeVisible({ timeout: 10_000 });
    await expect(dashLink).toHaveAttribute('href', '/admin/metrics');
    await expect(dashLink).toHaveAttribute('target', '_blank');
  });
});
