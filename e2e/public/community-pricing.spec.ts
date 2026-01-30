import { test, expect } from '../fixtures/test-fixtures';

test.describe('Community Pricing Page', () => {
  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.mockCommunityTiers();
    await mockApi.blockExternalApis();
    await page.goto('/community-pricing', { waitUntil: 'domcontentloaded' });
  });

  test('renders the page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await expect(page.locator('body')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('displays the community pricing heading', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Boost a Community');
  });

  test('displays the navbar and footer', async ({ page }) => {
    await expect(page.locator('nav').first()).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();
  });

  test('displays the subtitle description', async ({ page }) => {
    await expect(
      page.getByText('Give any community you')
    ).toBeVisible();
  });

  test('displays duration toggle buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /1 Month/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /3 Months/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /6 Months/ })).toBeVisible();
  });

  test('displays tier cards with Boost buttons', async ({ page }) => {
    // Wait for tier cards to render (from mock or fallback)
    const boostButtons = page.getByRole('button', { name: /Boost for \$/ });
    await expect(boostButtons.first()).toBeVisible({ timeout: 10000 });
    const count = await boostButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('tier cards display feature lists', async ({ page }) => {
    // Each tier card has features with check icons
    await expect(
      page.getByText('Boosted in search results').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('clicking a different duration updates prices', async ({ page }) => {
    // Wait for cards to load
    await expect(
      page.getByRole('button', { name: /Boost for \$/ }).first()
    ).toBeVisible({ timeout: 10000 });

    // Get the initial price text of the first boost button
    const firstButton = page.getByRole('button', { name: /Boost for \$/ }).first();
    const initialText = await firstButton.textContent();

    // Switch to 3 months
    await page.getByRole('button', { name: /3 Months/ }).click();

    // The price should have changed (3-month bundle price differs from 1-month)
    const updatedText = await firstButton.textContent();
    // Prices should differ between 1 month and 3 months
    expect(updatedText).not.toBe(initialText);
  });

  test('displays one-time purchase info text', async ({ page }) => {
    await expect(
      page.getByText('Community boosts are one-time purchases')
    ).toBeVisible();
  });

  test('has a back link', async ({ page }) => {
    const backLink = page.locator('a').filter({ hasText: 'Back' });
    await expect(backLink).toBeVisible();
  });
});
