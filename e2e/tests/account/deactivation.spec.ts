import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteUserByEmail,
  getUserByEmail,
  uniqueTestEmail,
} from '../../helpers/db';

/**
 * Deactivation hits DELETE /api/v1/user/:userId/deactivate, then the UI
 * redirects to /logout after a 2-second delay. We verify both:
 *   - user.isDeactivated = true in Mongo
 *   - subsequent protected-route access redirects to /login (session gone)
 */
test.describe('Account deactivation (Danger Zone)', { tag: '@auth' }, () => {
  test('user can deactivate their own account', async ({ browser }) => {
    const email = uniqueTestEmail('deactivate');
    const password = 'TestPass123!';
    await createTestUser({ email, password });

    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    try {
      // Log in as the fresh user.
      await page.goto('/login');
      await page.locator('#email').fill(email);
      await page.locator('#password').fill(password);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/communities**', { timeout: 15_000 });

      // Open profile → Danger Zone → Deactivate.
      await page.goto('/profile');
      await expect(page.getByText('Account Overview')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Danger Zone')).toBeVisible();
      await page.getByRole('button', { name: /Deactivate Account/i }).click();

      // Confirm in the modal. The confirm button text may vary — match broadly.
      await page
        .getByRole('button', { name: /yes.*deactivate|confirm.*deactivate|deactivate.*account/i })
        .last()
        .click();

      // DB should reflect deactivation.
      await expect
        .poll(
          async () => {
            const u = await getUserByEmail(email);
            return u?.user.isDeactivated ?? false;
          },
          { timeout: 15_000, intervals: [500, 1000, 2000] }
        )
        .toBe(true);

      // The UI auto-redirects to /logout after ~2s. Wait, then verify session
      // is gone by hitting a protected route.
      await page.waitForURL(/\/login|\/logout|\/$/, { timeout: 10_000 }).catch(() => {});
      await page.goto('/civ-dashboard');
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    } finally {
      await context.close();
      await deleteUserByEmail(email);
    }
  });
});
