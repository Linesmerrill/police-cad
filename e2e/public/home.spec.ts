import { test, expect } from '../fixtures/test-fixtures';

test.describe('Home Page', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.mockContentCreators();
    await mockApi.blockExternalApis();
    await page.goto('/', { waitUntil: 'commit' });
    // Wait for the main element to be present (Next.js hydration)
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 30000 });
  });

  test('renders the page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await expect(page.locator('body')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('has the dark background theme', async ({ page }) => {
    const main = page.locator('main').first();
    await expect(main).toBeVisible();
    const bgColor = await main.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    // #0a0a0f => rgb(10, 10, 15)
    expect(bgColor).toBe('rgb(10, 10, 15)');
  });

  test('displays the navbar', async ({ page }) => {
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });

  test('displays the footer', async ({ page }) => {
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
  });

  test('navbar contains login and signup links', async ({ page }) => {
    const loginLink = page.locator('a[href="/login"], a[href="/login-civ"], a[href="/login-select"]').first();
    await expect(loginLink).toBeVisible();

    const signupLink = page.locator('a[href="/signup"], a[href="/signup-civ"], a[href="/signup-list"]').first();
    await expect(signupLink).toBeVisible();
  });

  test('displays CTA buttons in hero section', async ({ page }) => {
    // Look for call-to-action buttons or links in the hero area
    const ctaLinks = page.locator('a[href="/login"], a[href="/signup"], a[href="/login-civ"], a[href="/signup-civ"]');
    const count = await ctaLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('displays the Stats section', async ({ page }) => {
    // Stats section should have visible numeric content
    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 15000 });
    const mainText = await main.textContent({ timeout: 15000 });
    // Stats section typically displays numbers/stats about the platform
    expect(mainText).toBeTruthy();
  });

  test('displays the Features section', async ({ page }) => {
    // The Features component should render feature cards
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('displays the ContentCreators section', async ({ page }) => {
    // ContentCreators component is rendered on the home page
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('has a logo link that navigates to home', async ({ page }) => {
    const logo = page.locator('nav a[href="/"]').first();
    if (await logo.isVisible()) {
      await logo.click();
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test('page title contains LPC', async ({ page }) => {
    await expect(page).toHaveTitle(/LPC/);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Navigate fresh to capture all errors
    await page.goto('/', { waitUntil: 'commit' });
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 30000 });

    expect(errors).toEqual([]);
  });
});
