import { test, expect } from '@playwright/test';

test.describe('Invalid Parameter Handling', { tag: '@auth' }, () => {
  test('invalid community hash renders error page', async ({ page }) => {
    // "not-a-valid-id" will base64-decode to garbage, failing the ObjectId regex
    await page.goto('/community/not-a-valid-id');

    // Should render the styled error page (not a raw 500)
    await expect(page.locator('.rp-error-card').first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('.rp-error-title')).toContainText('Something went sideways');
  });

  test('error page shows descriptive message for invalid community', async ({ page }) => {
    await page.goto('/community/not-a-valid-id');

    await expect(page.locator('.rp-error-message')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.rp-error-message')).toContainText(/community not found|error occurred/i);
  });

  test('error page has Return to Home button', async ({ page }) => {
    await page.goto('/community/not-a-valid-id');

    const homeBtn = page.locator('a.rp-btn[href="/"]');
    await expect(homeBtn).toBeVisible({ timeout: 10_000 });
    await expect(homeBtn).toHaveAttribute('href', '/');
  });

  test('error page returns non-500 status for invalid params', async ({ page }) => {
    const response = await page.goto('/community/not-a-valid-id');
    // Should be 404 (not 500) — the server validates the param and returns a proper error
    expect(response?.status()).not.toBe(500);
  });

  test('extremely long path does not crash the server', async ({ page }) => {
    const longPath = '/community/' + 'a'.repeat(500);
    const response = await page.goto(longPath);

    // Server should respond (not hang or crash)
    expect(response?.status()).toBeDefined();
    // Should not be a 500
    expect(response?.status()).not.toBe(500);
  });
});
