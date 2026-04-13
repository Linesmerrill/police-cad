import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Landing Page', () => {
  test('loads successfully', async ({ unauthPage: page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    // The page should contain key text content regardless of hydration state
    await expect(page.getByText(/Lines Police CAD|Police CAD|Join Discord/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('has navigation', async ({ unauthPage: page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Check for nav links by text rather than element type (SSR may structure differently)
    await expect(page.getByText(/HOME|PRICING|ABOUT|FAQ/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('has footer', async ({ unauthPage: page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Footer text should be present in SSR output
    await expect(page.getByText(/Lines Police CAD|©|All rights reserved/i).last()).toBeVisible({ timeout: 15_000 });
  });
});
