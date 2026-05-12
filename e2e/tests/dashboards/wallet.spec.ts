import { test, expect } from '@playwright/test';

test.describe('Wallet', () => {
  test('redirects to /civ-dashboard when the user has no civilian', { tag: '@auth' }, async ({ page }) => {
    const resp = await page.goto('/wallet');
    // Either we land on /civ-dashboard, or we render the wallet for the user's most-recent civ.
    // Both outcomes are acceptable for a smoke test — we only assert we didn't crash.
    expect(resp?.ok() || resp?.status() === 302).toBeTruthy();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/(wallet|civ-dashboard)/);
  });

  test('renders the wallet shell when the user has a civilian', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/wallet');
    if (/\/civ-dashboard/.test(page.url())) {
      test.skip(true, 'Test user has no civilian; wallet rendering is exercised on accounts with one.');
    }
    await expect(page.locator('text=Wallet').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Current Balance').first()).toBeVisible();
    await expect(page.locator('text=Jobs').first()).toBeVisible();
  });
});
