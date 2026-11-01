/**
 * The two things that made the Developer API unusable in production.
 *
 * First: the console told developers to send their key as `X-Developer-Key`,
 * a header this API has never read. Every request built from that instruction
 * was rejected with a message naming a different header entirely. The copy is
 * fixed; these pin it to the one header the middleware accepts, so the two
 * cannot drift apart again.
 *
 * Second: the API can be switched on but not yet configured with its signing
 * secret. Production was found in exactly that state, and the console happily
 * offered to create keys — keys whose hashes were computed against an empty
 * secret, so they matched nothing then and would match nothing once the secret
 * was set. The console now says so instead of handing out dead credentials.
 */
import { test, expect, Page, Route } from '@playwright/test';
import {
  DEVELOPER_API_AUTH_HEADER,
  DEVELOPER_API_AUTH_SCHEME,
  DEVELOPER_API_BASE_URL,
} from '../../../lib/developer-api-public';

const LIMITS = {
  requestsPerMinute: 60,
  requestsPerDay: 10000,
  keysPerDeveloper: 2,
  accountsPerKeyDay: 25,
  communitiesPerKeyDay: 2,
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function account(keyIssuanceAvailable: boolean) {
  return {
    enabled: true,
    account: { id: 'dev1', status: 'active', createdAt: '2026-09-01T00:00:00Z' },
    entitlement: { plan: 'free', source: 'website', websitePlan: '', lapsed: false },
    limits: LIMITS,
    availableScopes: [
      { scope: 'calls:read', description: 'Read calls' },
      { scope: 'communities:provision', description: 'Create communities owned by you' },
    ],
    keyCount: 0,
    keyIssuanceAvailable,
    termsVersion: '2026-11-01',
  };
}

async function mockConsole(page: Page, canIssue: boolean) {
  await page.route('**/api/developer/account', (route: Route) => json(route, account(canIssue)));
  await page.route('**/api/developer/keys', (route: Route) =>
    json(route, { keys: [], limits: LIMITS })
  );
  await page.route('**/api/developer/usage*', (route: Route) =>
    json(route, {
      plan: 'free',
      days: 30,
      series: [],
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
      resetsAt: null,
    })
  );
  await page.route('**/api/developer/communities', (route: Route) =>
    json(route, { data: [], totalCount: 0 })
  );
}

test.describe('Developer API go-live', { tag: '@auth' }, () => {
  test('the console names the header the API actually accepts', async ({ page }) => {
    await mockConsole(page, true);
    await page.goto('/developer');

    const expected = `${DEVELOPER_API_AUTH_HEADER}: ${DEVELOPER_API_AUTH_SCHEME}`;
    await expect(page.getByText(expected, { exact: false }).first()).toBeVisible({
      timeout: 20_000,
    });

    // The header it used to name is gone, not merely joined by the right one.
    await expect(page.locator('body')).not.toContainText('X-Developer-Key');
  });

  test('the create page names it too', async ({ page }) => {
    await mockConsole(page, true);
    await page.goto('/developer/keys/new');
    await expect(page.getByRole('heading', { name: 'New key' })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('body')).not.toContainText('X-Developer-Key');
  });

  test('no console page mentions a header the API does not read', async ({ page }) => {
    await mockConsole(page, true);
    for (const path of ['/developer', '/developer/keys', '/developer/keys/new', '/developer/settings']) {
      await page.goto(path);
      await expect(page.locator('.dc-main')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('body'), `${path} still names X-Developer-Key`).not.toContainText(
        'X-Developer-Key'
      );
    }
  });

  test('the documented base URL is the one constant, everywhere', async ({ page }) => {
    // The public docs page is built from the same constant as the console, so
    // a host change cannot leave one of them stale.
    await page.goto('/api-docs');
    await expect(page.locator('body')).toContainText(DEVELOPER_API_BASE_URL, { timeout: 20_000 });
  });

  test.describe('when the API is not switched on yet', () => {
    test('the overview says so and offers no key button', async ({ page }) => {
      await mockConsole(page, false);
      await page.goto('/developer');

      await expect(page.getByTestId('api-not-switched-on')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/isn.t switched on yet/i)).toBeVisible();
      // The point of the state: no route to a key that would be born dead.
      await expect(page.getByRole('link', { name: 'New key' })).toHaveCount(0);
    });

    test('the key list says so and offers no key button', async ({ page }) => {
      await mockConsole(page, false);
      await page.goto('/developer/keys');

      await expect(page.getByTestId('api-not-switched-on')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole('link', { name: 'New key' })).toHaveCount(0);
    });

    test('the create page shows no form at all', async ({ page }) => {
      await mockConsole(page, false);
      await page.goto('/developer/keys/new');

      await expect(page.getByTestId('api-not-switched-on')).toBeVisible({ timeout: 20_000 });
      // Not a disabled form: submitting could never have worked, and the API
      // refuses the write regardless.
      await expect(page.getByRole('button', { name: 'Create key' })).toHaveCount(0);
      await expect(page.locator('#dc-key-name')).toHaveCount(0);
    });

    test('it says the account is fine, because it is', async ({ page }) => {
      await mockConsole(page, false);
      await page.goto('/developer');

      const notice = page.getByTestId('api-not-switched-on');
      await expect(notice).toBeVisible({ timeout: 20_000 });
      await expect(notice).toContainText(/nothing is wrong with your account/i);
    });
  });

  test('the console offers keys normally once it is switched on', async ({ page }) => {
    await mockConsole(page, true);
    await page.goto('/developer');

    await expect(page.getByTestId('api-not-switched-on')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'New key' })).toBeVisible({ timeout: 20_000 });
  });
});
