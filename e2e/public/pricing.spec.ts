import { test, expect } from '../fixtures/test-fixtures';

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.mockSubscriptionTiers();
    await mockApi.blockExternalApis();
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
  });

  test('renders the page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await expect(page.locator('body')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('displays the pricing heading', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Upgrade Your Experience');
  });

  test('displays the navbar and footer', async ({ page }) => {
    await expect(page.locator('nav').first()).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();
  });

  test('displays the free tier info', async ({ page }) => {
    await expect(page.getByText('100% free')).toBeVisible();
    await expect(page.getByText('Free Forever')).toBeVisible();
  });

  test('displays billing toggle buttons', async ({ page }) => {
    const monthlyButton = page.getByRole('button', { name: 'Monthly' });
    const annualButton = page.getByRole('button', { name: /Annual/ });

    await expect(monthlyButton).toBeVisible();
    await expect(annualButton).toBeVisible();
  });

  test('displays Save 12% badge on annual toggle', async ({ page }) => {
    await expect(page.getByText('Save 12%')).toBeVisible();
  });

  test('displays pricing tier cards', async ({ page }) => {
    // The page fetches tiers from API or falls back to default tiers
    // Wait for the tier cards to appear (either from mock or fallback)
    const tierCards = page.locator('h3');
    await expect(tierCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('displays subscribe buttons on tier cards', async ({ page }) => {
    // Wait for the pricing cards to load
    const subscribeButtons = page.getByRole('button', { name: 'Subscribe' });
    // There should be at least one subscribe button (unauthenticated users see subscribe)
    const count = await subscribeButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('switching to annual billing updates the UI', async ({ page }) => {
    const annualButton = page.getByRole('button', { name: /Annual/ });
    await annualButton.click();

    // After clicking annual, the price display should show /year
    await expect(page.getByText('/year').first()).toBeVisible();
  });

  test('switching to monthly billing shows /month', async ({ page }) => {
    const monthlyButton = page.getByRole('button', { name: 'Monthly' });
    await monthlyButton.click();

    await expect(page.getByText('/month').first()).toBeVisible();
  });

  test('displays manage subscription link', async ({ page }) => {
    const manageLink = page.locator('a[href="/manage-subscription"]');
    await expect(manageLink).toBeVisible();
    await expect(manageLink).toContainText('Manage it here');
  });

  test('displays cancellation info text', async ({ page }) => {
    await expect(
      page.getByText('All subscriptions can be cancelled at any time')
    ).toBeVisible();
  });
});
