import { test, expect } from '../fixtures/test-fixtures';

// Helper to wait for React hydration on a specific element
async function waitForHydration(page: any, selector: string) {
  await page.waitForFunction(
    (sel: string) => {
      const el = document.querySelector(sel);
      return (
        el &&
        Object.keys(el).some(
          (k) =>
            k.startsWith('__reactFiber$') ||
            k.startsWith('__reactInternalInstance$')
        )
      );
    },
    selector,
    { timeout: 30000 }
  );
}

test.describe('Pricing Page', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.mockSubscriptionTiers();
    await mockApi.blockExternalApis();
    await page.goto('/pricing', { waitUntil: 'commit' });
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 30000 });
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
    await expect(page.getByText('100% free').first()).toBeVisible();
    await expect(page.getByText('Free Forever').first()).toBeVisible();
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
    // Wait for the pricing cards to load by waiting for the first subscribe button
    const subscribeButtons = page.getByRole('button', { name: 'Subscribe' });
    await expect(subscribeButtons.first()).toBeVisible({ timeout: 10000 });
    const count = await subscribeButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('switching to annual billing updates the UI', async ({ page }) => {
    // Wait for React hydration so button handlers are attached
    await waitForHydration(page, 'button');
    const annualButton = page.getByRole('button', { name: /Annual/ });
    await annualButton.click();

    // After clicking annual, the price display should show /year
    await expect(page.getByText('/year').first()).toBeVisible({ timeout: 5000 });
  });

  test('switching to monthly billing shows /month', async ({ page }) => {
    // Wait for React hydration so button handlers are attached
    await waitForHydration(page, 'button');
    const monthlyButton = page.getByRole('button', { name: 'Monthly' });
    await monthlyButton.click();

    await expect(page.getByText('/month').first()).toBeVisible({ timeout: 5000 });
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
