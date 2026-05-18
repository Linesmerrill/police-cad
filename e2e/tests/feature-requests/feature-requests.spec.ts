import { test, expect, Page } from '@playwright/test';
import {
  seedFeatureRequest,
  cleanupSeededFeatureRequests,
  TEST_FR_OPEN_ID,
  TEST_FR_RELEASED_ID,
  TEST_FR_BETA_ID,
  TEST_FR_DECLINED_ID,
  TEST_FR_PREFIX,
} from '../../helpers/feature-requests';

const OPEN_TITLE = `${TEST_FR_PREFIX} an open request for the default list`;
const RELEASED_TITLE = `${TEST_FR_PREFIX} a released request for the carousel`;
const BETA_TITLE = `${TEST_FR_PREFIX} a request currently in beta testing`;
const DECLINED_TITLE = `${TEST_FR_PREFIX} a declined request that should be hidden by default`;

// Wait for the listing fetch to settle. We watch for the response so the test
// is decoupled from arbitrary timing/`networkidle` quirks.
async function waitForListingFetch(page: Page) {
  await page.waitForResponse(
    (res) => res.url().includes('/api/v2/feature-requests') && res.status() === 200,
    { timeout: 15_000 }
  ).catch(() => { /* the page may have prefetched; non-fatal */ });
}

test.describe('Feature Requests — listing page', { tag: '@auth' }, () => {
  test.beforeAll(async () => {
    await cleanupSeededFeatureRequests();

    const now = new Date();
    // Use a slightly stale createdAt so trending order doesn't surprise us,
    // but a fresh updatedAt on the released item so it lands at the top of
    // the "Recently Shipped" carousel (sort=newest, limit=8).
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    await seedFeatureRequest({
      _id: TEST_FR_OPEN_ID,
      title: OPEN_TITLE,
      description: 'E2E open description',
      status: 'open',
      upvoteCount: 7,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    });

    await seedFeatureRequest({
      _id: TEST_FR_RELEASED_ID,
      title: RELEASED_TITLE,
      description: 'E2E released description',
      status: 'released',
      upvoteCount: 12,
      createdAt: oneHourAgo,
      updatedAt: now,
    });

    await seedFeatureRequest({
      _id: TEST_FR_BETA_ID,
      title: BETA_TITLE,
      description: 'E2E beta-testing description',
      status: 'beta_testing',
      upvoteCount: 4,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    });

    await seedFeatureRequest({
      _id: TEST_FR_DECLINED_ID,
      title: DECLINED_TITLE,
      description: 'E2E declined description',
      status: 'declined',
      upvoteCount: 2,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    });
  });

  test.afterAll(async () => {
    await cleanupSeededFeatureRequests();
  });

  test('renders without the Beta badge', async ({ page }) => {
    await page.goto('/feature-requests');
    await expect(page).not.toHaveURL(/\/login/);

    await expect(page.locator('h1:has-text("Feature Requests")').first()).toBeVisible({ timeout: 10_000 });

    // The "Beta" badge that used to live next to the H1 should be gone now that
    // the feature requests system is out of beta.
    const headerArea = page.locator('h1:has-text("Feature Requests")').first().locator('xpath=..');
    await expect(headerArea.getByText('Beta', { exact: true })).toHaveCount(0);
  });

  test('status filter dropdown lists the new options and not the removed ones', async ({ page }) => {
    await page.goto('/feature-requests');
    await expect(page).not.toHaveURL(/\/login/);

    // Open the filter dropdown
    await page.getByRole('button', { name: /All Statuses/i }).first().click();

    // New status: "In Beta Testing" replaces "In Progress"
    await expect(page.getByRole('button', { name: 'In Beta Testing', exact: true })).toBeVisible();

    // Other surviving statuses
    await expect(page.getByRole('button', { name: 'Open', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Planned', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Released', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Declined', exact: true })).toBeVisible();

    // Removed statuses must not appear anywhere on the page
    await expect(page.getByRole('button', { name: 'Under Review', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'In Progress', exact: true })).toHaveCount(0);
  });

  test('Recently Shipped carousel renders and contains a recently released item', async ({ page }) => {
    await page.goto('/feature-requests');
    await expect(page).not.toHaveURL(/\/login/);
    await waitForListingFetch(page);

    const carousel = page.getByRole('region', { name: /Recently shipped feature requests/i });

    // Section is mounted (not hidden by the empty-state guard)
    await expect(carousel).toBeVisible({ timeout: 10_000 });

    // The seeded released item lands inside the carousel
    await expect(carousel.getByText(RELEASED_TITLE)).toBeVisible();
  });

  test('default browse hides released items but they appear when filter is Released', async ({ page }) => {
    // sort=newest gives us deterministic ordering for the seeded items
    await page.goto('/feature-requests?sort=newest');
    await expect(page).not.toHaveURL(/\/login/);
    await waitForListingFetch(page);

    // Open is in the main list (default browse)
    await expect(page.getByRole('heading', { name: OPEN_TITLE })).toBeVisible({ timeout: 10_000 });

    // The released item appears exactly once on the page — only inside the carousel
    await expect(async () => {
      const occurrences = await page.getByText(RELEASED_TITLE).count();
      expect(occurrences).toBe(1);
    }).toPass({ timeout: 10_000 });

    // Switch the filter to Released
    await page.getByRole('button', { name: /All Statuses/i }).first().click();
    await page.getByRole('button', { name: 'Released', exact: true }).click();
    await waitForListingFetch(page);

    // Now the released item appears twice — once in the carousel, once in the
    // main list (since the user explicitly asked for Released)
    await expect(async () => {
      const occurrences = await page.getByText(RELEASED_TITLE).count();
      expect(occurrences).toBe(2);
    }).toPass({ timeout: 10_000 });
  });

  test('default browse hides declined items but they appear when filter is Declined', async ({ page }) => {
    // Capture the listing request so we can assert the proxy forwarded BOTH
    // excludeStatus values (released AND declined). This is the regression we
    // are guarding against — the proxy used to collapse a multi-value param
    // into a single comma-joined string, so the API only filtered one status.
    const listingRequests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/v2/feature-requests') && !url.includes('status=released')) {
        listingRequests.push(url);
      }
    });

    await page.goto('/feature-requests?sort=newest');
    await expect(page).not.toHaveURL(/\/login/);
    await waitForListingFetch(page);

    // Open is visible in the default list
    await expect(page.getByRole('heading', { name: OPEN_TITLE })).toBeVisible({ timeout: 10_000 });

    // Declined item is hidden from the default list (no occurrences anywhere on
    // the page — declined items aren't in the Recently Shipped carousel either).
    await expect(async () => {
      const occurrences = await page.getByText(DECLINED_TITLE).count();
      expect(occurrences).toBe(0);
    }).toPass({ timeout: 10_000 });

    // The default browse request must include excludeStatus=declined alongside
    // excludeStatus=released. We look for both individual params being present,
    // which is only true when the proxy forwards a multi-value query param
    // correctly (rather than collapsing the array into "released,declined").
    expect(listingRequests.some(u =>
      u.includes('excludeStatus=released') && u.includes('excludeStatus=declined')
    )).toBe(true);

    // Switch the filter to Declined
    await page.getByRole('button', { name: /All Statuses/i }).first().click();
    await page.getByRole('button', { name: 'Declined', exact: true }).click();
    await waitForListingFetch(page);

    // The declined item now shows up in the list
    await expect(page.getByRole('heading', { name: DECLINED_TITLE })).toBeVisible({ timeout: 10_000 });
  });

  test('searching with All Statuses surfaces released items in results', async ({ page }) => {
    await page.goto('/feature-requests');
    await expect(page).not.toHaveURL(/\/login/);
    await waitForListingFetch(page);

    // Default browse: 1 occurrence of the released title (carousel only)
    await expect(async () => {
      const occurrences = await page.getByText(RELEASED_TITLE).count();
      expect(occurrences).toBe(1);
    }).toPass({ timeout: 10_000 });

    // Search by something unique to the released item's title
    await page.getByPlaceholder('Search feature requests...').fill('released request for the carousel');
    await waitForListingFetch(page);

    // Search results should also show the released item — 2 occurrences total
    await expect(async () => {
      const occurrences = await page.getByText(RELEASED_TITLE).count();
      expect(occurrences).toBe(2);
    }).toPass({ timeout: 10_000 });
  });
});

test.describe('Feature Requests — detail page', { tag: '@auth' }, () => {
  test.beforeAll(async () => {
    await cleanupSeededFeatureRequests();
    await seedFeatureRequest({
      _id: TEST_FR_OPEN_ID,
      title: OPEN_TITLE,
      description: 'E2E open description',
      status: 'open',
      upvoteCount: 1,
    });
  });

  test.afterAll(async () => {
    await cleanupSeededFeatureRequests();
  });

  test('detail page renders the request and has no Beta badge', async ({ page }) => {
    await page.goto(`/feature-requests/${TEST_FR_OPEN_ID.toHexString()}`);
    await expect(page).not.toHaveURL(/\/login/);

    // The request title shows up as a heading
    await expect(page.getByRole('heading', { name: OPEN_TITLE })).toBeVisible({ timeout: 10_000 });

    // The Beta badge that used to live next to the back link should be gone.
    // Scope the assertion to the back-link area to avoid colliding with the
    // "In Beta Testing" status pill if that's rendered somewhere on the page.
    const backLink = page.getByRole('link', { name: /Back to Feature Requests/i });
    await expect(backLink).toBeVisible();
    await expect(backLink.locator('xpath=..').getByText('Beta', { exact: true })).toHaveCount(0);
  });
});
