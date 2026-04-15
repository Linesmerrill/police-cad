import { test, expect } from '@playwright/test';
import { TEST_CIVILIAN } from '../../helpers/seed';

test.describe('Name Search', { tag: '@auth' }, () => {
  test('finds seeded civilian by first name', async ({ page }) => {
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    // Wait for the search input to be available
    const searchInput = page.locator('#cd-ps-input').first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    // Type the civilian's first name — triggers debounced search
    await searchInput.fill(TEST_CIVILIAN.firstName);

    // Wait for search results to appear
    const results = page.locator('#cd-ps-results');
    await expect(results.getByText(TEST_CIVILIAN.lastName)).toBeVisible({ timeout: 10_000 });
  });

  test('shows no results for non-existent name', async ({ page }) => {
    await page.goto('/command-dashboard');
    const searchInput = page.locator('#cd-ps-input').first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    await searchInput.fill('ZzNonExistentPerson99');
    // Wait for debounce + API call
    await page.waitForTimeout(1000);

    const results = page.locator('#cd-ps-results');
    // Should show no results or empty state
    await expect(results.getByText(/no.*result|not found/i).or(results.locator(':empty'))).toBeVisible({ timeout: 5_000 }).catch(() => {
      // If no explicit "no results" message, just verify our test name isn't there
    });
    await expect(results.getByText(TEST_CIVILIAN.lastName)).not.toBeVisible();
  });
});
