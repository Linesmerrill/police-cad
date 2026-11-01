/**
 * The scope presets on the key-creation form.
 *
 * Its own file, fully mocked, and deliberately not added to
 * developer-api.spec.ts. That file has tests that talk to the real API and
 * share one developer account with developer-console.spec.ts, whose afterAll
 * turns developer access off and revokes every key. With two workers those two
 * files can overlap, so anything that changes the length of either changes
 * which of them is mid-test when the account goes away. A new test in a new
 * file leaves that timing alone.
 */
import { test, expect, Route } from '@playwright/test';

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

const LIMITS = {
  requestsPerMinute: 60,
  requestsPerDay: 10000,
  keysPerDeveloper: 2,
  accountsPerKeyDay: 25,
  communitiesPerKeyDay: 2,
};

// More read scopes than the four under test, on purpose. With only
// community:read, reports:read and warrants:read available, the "Read only"
// preset and "Read reports" would select exactly the same set and the
// highlight would land on whichever is listed first. A real plan has other
// read scopes, so this fixture has them too.
const SCOPES = [
  { scope: 'community:read', description: "Read the community's profile, departments and ten-codes" },
  { scope: 'units:read', description: 'See who is on duty' },
  { scope: 'units:write', description: "Set a member's status, ten-code and location" },
  { scope: 'civilians:read', description: 'Look up civilians by name' },
  { scope: 'reports:read', description: 'Read the report drafts this key created' },
  { scope: 'reports:write', description: 'Write report drafts for a person to review and file' },
  { scope: 'warrants:read', description: "Read the community's warrants" },
  { scope: 'warrants:write', description: "Request a warrant for the community's reviewer" },
];

test.describe('Scope presets on the key form', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/developer/account', (route: Route) =>
      json(route, {
        enabled: true,
        account: { id: 'dev1', status: 'active', termsAcceptedAt: '2026-10-01T00:00:00Z' },
        limits: LIMITS,
        availableScopes: SCOPES,
        keyCount: 0,
        entitlement: { plan: 'free', source: 'website_plan', websitePlan: 'free', lapsed: false },
        upgradeUrl: '/pricing',
      })
    );
    await page.route('**/api/user/current', (route: Route) =>
      json(route, { user: { _id: 'u1', username: 'dev' } })
    );
    await page.route('**/api/developer/keys', (route: Route) => {
      if (route.request().method() === 'GET') return json(route, { keys: [], limits: LIMITS });
      return route.fallback();
    });
    await page.route('**/api/developer/communities', (route: Route) => json(route, { data: [] }));
  });

  test('reading and drafting are separate presets, in plain language', async ({ page }) => {
    await page.goto('/developer/keys/new');

    // Two presets, not one. An integration that only reconciles, or only asks
    // whether there is a warrant out for somebody, wants a key that cannot
    // write a thing.
    await page.getByRole('button', { name: 'Read reports' }).click();
    await expect(page.getByText(/cannot write anything/i)).toBeVisible();

    await page.getByRole('button', { name: 'Draft reports' }).click();
    // The hint is the plain-language description, and it leads with the thing
    // that matters most about both scopes.
    await expect(page.getByText(/Neither files anything/i)).toBeVisible();
  });

  test('each permission reads as what it lets a key do', async ({ page }) => {
    await page.goto('/developer/keys/new');

    // The scope string stays on screen, because that is what goes in the
    // developer's code. The sentence under it is what a community owner
    // approving the key needs, and it is not the API's own one-liner.
    await expect(
      page.getByText('Prepare draft reports for a person here to read and file. It cannot file one')
    ).toBeVisible();
    await expect(
      page.getByText('Ask for a warrant. The request waits for a reviewer, as it does in the CAD')
    ).toBeVisible();
    await expect(page.getByText('reports:write')).toBeVisible();
    await expect(page.getByText('warrants:write')).toBeVisible();
  });

  test('the preset labels cannot be confused with each other', async ({ page }) => {
    await page.goto('/developer/keys/new');

    // "Read only" and an earlier draft's "Reports, read only" read as near
    // duplicates on one row of chips, and a strict locator said so before a
    // reader had to. Each label is now distinct on its own.
    for (const label of ['Read only', 'Dispatch', 'Read reports', 'Draft reports', 'Everything']) {
      await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(1);
    }
  });
});
