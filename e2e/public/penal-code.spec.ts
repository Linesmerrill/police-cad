import { test, expect } from '../fixtures/test-fixtures';

test.describe('Penal Code Page', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();
    await page.goto('/penal-code', { waitUntil: 'commit' });
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 30000 });
  });

  test('renders the page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await expect(page.locator('body')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('displays the Penal Codes heading', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Penal Codes');
  });

  test('displays the subtitle description', async ({ page }) => {
    await expect(
      page.getByText('A comprehensive reference guide for violations and their penalties')
    ).toBeVisible();
  });

  test('displays the navbar and footer', async ({ page }) => {
    await expect(page.locator('nav').first()).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();
  });

  test('has a search input for filtering violations', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search violations...');
    await expect(searchInput).toBeVisible();
  });

  test('displays penal code category sections', async ({ page }) => {
    // The page renders categories with headings in h2 elements
    const categoryHeadings = page.locator('section h2');
    const count = await categoryHeadings.count();
    expect(count).toBeGreaterThan(0);
  });

  test('displays violation tables', async ({ page }) => {
    // Each category has a table with violations
    const tables = page.locator('table');
    const count = await tables.count();
    expect(count).toBeGreaterThan(0);
  });

  test('tables have header columns', async ({ page }) => {
    const headerCells = page.locator('table thead th');
    const count = await headerCells.count();
    expect(count).toBeGreaterThan(0);
  });

  test('tables have data rows', async ({ page }) => {
    const dataRows = page.locator('table tbody tr');
    const count = await dataRows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('search filters violations and shows result count', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search violations...');
    await searchInput.waitFor({ state: 'visible' });
    // Wait for React hydration by checking for React fiber on the element
    await page.waitForFunction(() => {
      const el = document.querySelector('input[placeholder="Search violations..."]');
      return el && Object.keys(el).some(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    }, { timeout: 30000 });
    await searchInput.fill('assault');

    // Should display a result count
    await expect(page.getByText(/Found \d+ result/)).toBeVisible({ timeout: 10000 });
  });

  test('search with no results shows empty state', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search violations...');
    await searchInput.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const el = document.querySelector('input[placeholder="Search violations..."]');
      return el && Object.keys(el).some(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    }, { timeout: 30000 });
    await searchInput.fill('xyznonexistent');

    await expect(page.getByText('No violations match')).toBeVisible({ timeout: 10000 });
  });

  test('has a Back button', async ({ page }) => {
    const backButton = page.getByRole('button', { name: /Back/ });
    await expect(backButton).toBeVisible();
  });

  test('displays violation count per category', async ({ page }) => {
    // Each category section shows the count of violations
    await expect(page.getByText(/\d+ violations?/).first()).toBeVisible();
  });

  test('has sidebar navigation on desktop', async ({ page }) => {
    // Desktop sidebar contains navigation links for categories
    const sidebar = page.locator('nav').filter({ has: page.locator('a[href^="#"]') });
    // On desktop, the sidebar navigation should be present
    const sidebarLinks = page.locator('a[href^="#"]');
    const count = await sidebarLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});
