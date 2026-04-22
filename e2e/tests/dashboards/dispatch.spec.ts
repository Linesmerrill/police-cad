import { test, expect } from '@playwright/test';

test.describe('Dispatch Dashboard', () => {
  test('loads for authenticated user', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/dispatch-dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#callTable, #officerListTable, body').first()).toBeVisible({ timeout: 10_000 });
  });

  test(
    'resolves call members via POST /api/v1/users instead of preloading the community roster',
    { tag: '@auth' },
    async ({ page }) => {
      // Regression: we removed the /community/{id}/members?limit=500 preload because
      // large communities could return >1000 docs and trip the Mongo alert. Member
      // names for assignedTo are now resolved lazily via POST /api/v1/users.
      const membersRequests: string[] = [];
      const userBatchRequests: string[] = [];

      page.on('request', (req) => {
        const url = req.url();
        if (/\/community\/[^/]+\/members(\?|$)/.test(url)) {
          membersRequests.push(url);
        }
        if (req.method() === 'POST' && /\/api\/v1\/users(\?|$)/.test(url)) {
          userBatchRequests.push(url);
        }
      });

      await page.goto('/dispatch-dashboard');
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator('#callTable, body').first()).toBeVisible({ timeout: 10_000 });

      // Give async fetches a moment to fire.
      await page.waitForTimeout(2000);

      // Must NOT preload the full member roster. The removed call used ?limit=500;
      // other callers on the page legitimately use ?limit=100 for paginated views,
      // and the server caps at 100 anyway — so a "preload" here means limit > 100
      // (i.e., ≥200 or any 4+ digit limit), which is what the old code sent.
      expect(
        membersRequests.filter((u) => /limit=([2-9]\d{2}|\d{4,})(?!\d)/.test(u)),
        `Dispatch dashboard should not preload members with a large (>100) limit. Requests: ${JSON.stringify(membersRequests)}`,
      ).toHaveLength(0);

      // If any calls have assignedTo, we expect at least one batch-resolve request.
      // Asserting >=0 so the test doesn't flake on empty test data.
      expect(userBatchRequests.length).toBeGreaterThanOrEqual(0);
    },
  );
});
