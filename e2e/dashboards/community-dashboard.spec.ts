import { test, expect } from '../fixtures/test-fixtures';

test.describe('Community Dashboard', () => {
  test.describe('Page Load', () => {
    test('loads without server errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      const response = await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      expect(response?.status()).toBeLessThan(500);
    });

    test('has the correct page title', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      await expect(page).toHaveTitle(/LPC/);
    });

    test('renders the body with content', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  });

  test.describe('Navigation', () => {
    test('displays the top navigation bar', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const topNav = page.locator('#topNav');
      await expect(topNav).toBeAttached();
    });

    test('navbar has notification bell', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const notificationSymbol = page.locator('#notification-symbol');
      await expect(notificationSymbol).toBeAttached();
    });

    test('navbar has notification count badge', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const notificationCount = page.locator('#notification-count');
      await expect(notificationCount).toBeAttached();
    });
  });

  test.describe('Dashboard Header', () => {
    test('displays Community Dashboard heading', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const heading = page.getByText('Community Dashboard');
      await expect(heading).toBeVisible();
    });

    test('has a header section with background image', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const header = page.locator('#third');
      await expect(header).toBeAttached();
    });
  });

  test.describe('Active Community Section', () => {
    test('has an active community display area', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const activeCommunity = page.locator('#active-community-display');
      await expect(activeCommunity).toBeAttached();
    });

    test('has a departments section', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const departments = page.locator('#departments-section');
      await expect(departments).toBeAttached();
    });

    test('has a View Departments link', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const viewDeptsLink = page.locator('#view-departments-link');
      await expect(viewDeptsLink).toBeAttached();
      await expect(viewDeptsLink).toHaveAttribute('href', '/departments');
    });
  });

  test.describe('Community Cards Section', () => {
    test('has a community cards container', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const cardsContainer = page.locator('#community-cards');
      await expect(cardsContainer).toBeAttached();
    });

    test('has pagination controls', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const prevBtn = page.locator('#prev-page');
      const nextBtn = page.locator('#next-page');
      const pageInfo = page.locator('#page-info');

      await expect(prevBtn).toBeAttached();
      await expect(nextBtn).toBeAttached();
      await expect(pageInfo).toBeAttached();
    });

    test('previous page button is initially disabled', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const prevBtn = page.locator('#prev-page');
      await expect(prevBtn).toBeDisabled();
    });

    test('page info shows Page 1 of 1 initially', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const pageInfo = page.locator('#page-info');
      await expect(pageInfo).toContainText('Page 1 of 1');
    });
  });

  test.describe('Success Message', () => {
    test('success message container exists and is hidden', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const successMsg = page.locator('#successCopyMessage');
      await expect(successMsg).toBeAttached();
      await expect(successMsg).not.toBeVisible();
    });
  });

  test.describe('Modals', () => {
    test('tutorial modal is present but hidden', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#tutorialModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('tutorial modal has welcome title', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const title = page.locator('#tutorialModal').getByText('Welcome to the Community Dashboard');
      await expect(title).toBeAttached();
    });

    test('delete modal is present but hidden', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#deleteModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('migrate modal is present but hidden', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#migrateModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('migrate step two modal is present but hidden', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#migrateStepTwoModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('loading overlay modal is present but hidden', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#loadingOverlay');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Community Operations', () => {
    test('Active Community heading is present', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const heading = page.getByText('Active Community').first();
      await expect(heading).toBeAttached();
    });

    test('Departments heading is present', async ({ page }) => {
      await page.goto('/community-dashboard', { waitUntil: 'domcontentloaded' });

      const heading = page.getByText('Departments in Active Community').first();
      await expect(heading).toBeAttached();
    });
  });
});
