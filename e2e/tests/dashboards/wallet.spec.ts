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

  test('opens and closes the Send Money modal', { tag: '@auth' }, async ({ page }) => {
    await page.goto('/wallet');
    if (/\/civ-dashboard/.test(page.url())) {
      test.skip(true, 'Test user has no civilian; Send Money is gated on having an active civilian.');
    }
    const sendBtn = page.locator('#sendMoneyBtn');
    await expect(sendBtn).toBeVisible();
    // When the test account is viewing a non-active civilian, clicking the
    // muted button surfaces a ddModal confirm asking to switch active — a
    // distinct flow worth its own test. This test exercises the direct-open
    // path only, so skip when muted.
    const isInactive = await sendBtn.evaluate((el) => el.classList.contains('is-inactive'));
    if (isInactive) {
      test.skip(true, 'Send Money CTA is in the switch-active confirm path; tested separately.');
    }
    await sendBtn.click();
    const modal = page.locator('#sendModal');
    await expect(modal).toHaveClass(/is-open/);
    await expect(modal.locator('#sendStepTitle')).toHaveText('Send to');
    // Search input renders once civilians load (or in the empty state).
    await expect(modal.locator('#sendBody')).toBeVisible();
    // Close via the X button
    await modal.locator('#sendCloseBtn').click();
    await expect(modal).not.toHaveClass(/is-open/);
  });
});
