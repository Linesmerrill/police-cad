import { test, expect } from '../fixtures/test-fixtures';

test.describe('Terms and Conditions Page', () => {
  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();
    await page.goto('/terms-and-conditions', { waitUntil: 'domcontentloaded' });
  });

  test('renders the page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await expect(page.locator('body')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('displays the Terms and Conditions heading', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Terms and Conditions');
  });

  test('displays the last updated date', async ({ page }) => {
    await expect(
      page.getByText(/Last updated:/)
    ).toBeVisible();
  });

  test('displays the navbar and footer', async ({ page }) => {
    await expect(page.locator('nav').first()).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();
  });

  test('displays the welcome section', async ({ page }) => {
    await expect(
      page.getByText('Welcome to Lines Police CAD!')
    ).toBeVisible();
  });

  test('displays key terms sections', async ({ page }) => {
    // Check for major section headings within the terms
    await expect(page.getByText('Cookies', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('License', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Subscriptions', { exact: true })).toBeVisible();
    await expect(page.getByText('Disclaimer', { exact: true })).toBeVisible();
  });

  test('displays subscription plan details', async ({ page }) => {
    await expect(page.getByText('User Subscription Plans').first()).toBeVisible();
    await expect(page.getByText('Base Plan').first()).toBeVisible();
    await expect(page.getByText('Premium Plan').first()).toBeVisible();
    await expect(page.getByText('Premium + Plan').first()).toBeVisible();
  });

  test('displays community boost section', async ({ page }) => {
    await expect(
      page.getByText('Community Boost & Promotion')
    ).toBeVisible();
    await expect(
      page.getByText('Web Community Boosts')
    ).toBeVisible();
  });

  test('displays content creator program section', async ({ page }) => {
    await expect(
      page.getByText('Content Creator Program', { exact: true })
    ).toBeVisible();
    await expect(page.getByText('Eligibility Requirements')).toBeVisible();
    await expect(page.getByText('Program Benefits')).toBeVisible();
  });

  test('displays the you must not list', async ({ page }) => {
    await expect(page.getByText('You must not:')).toBeVisible();
    await expect(
      page.getByText('Republish material from Lines Police CAD')
    ).toBeVisible();
  });

  test('has a link to Privacy Policy', async ({ page }) => {
    const privacyLink = page.locator('a[href="/privacy-policy"]');
    await expect(privacyLink).toBeVisible();
  });

  test('displays iFrames section', async ({ page }) => {
    await expect(page.getByText('iFrames')).toBeVisible();
  });

  test('displays disclaimer section content', async ({ page }) => {
    await expect(
      page.getByText('To the maximum extent permitted by applicable law')
    ).toBeVisible();
  });
});
