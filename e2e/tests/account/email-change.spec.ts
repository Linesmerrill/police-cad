import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteUserByEmail,
  getUserByEmail,
  uniqueTestEmail,
} from '../../helpers/db';

/**
 * Email change is a 3-step flow on the profile page:
 *   1. POST /api/verify-password to confirm current password.
 *   2. POST /api/check-email to confirm the new email is available.
 *   3. POST /manageAccount with action=changeEmail to persist.
 *
 * Uses a fresh user so we don't mutate the shared testuser@test.com seed.
 */
test.describe('Email change (profile Danger Zone adjacent)', { tag: '@auth' }, () => {
  test('user can change their email via the profile modal', async ({ browser }) => {
    const originalEmail = uniqueTestEmail('email-old');
    const newEmail = uniqueTestEmail('email-new');
    const password = 'TestPass123!';
    await createTestUser({ email: originalEmail, password });

    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    try {
      // Log in as the fresh user.
      await page.goto('/login');
      await page.locator('#email').fill(originalEmail);
      await page.locator('#password').fill(password);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/communities**', { timeout: 15_000 });

      // Open profile → Change Email modal.
      await page.goto('/profile');
      await expect(page.getByText('Account Overview')).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: /Change Email/i }).click();

      // Fill new email + current password. Use first() because modal fields
      // may share selectors with other modals on the same page.
      const emailField = page.locator('input[type="email"]').last();
      await emailField.waitFor({ state: 'visible', timeout: 10_000 });
      await emailField.fill(newEmail);
      // Current password field is a password input inside the modal.
      await page.locator('input[type="password"]').last().fill(password);

      // Submit (the modal's save/change button).
      await page
        .getByRole('button', { name: /change email|save|update email/i })
        .last()
        .click();

      // Poll the DB — the profile UI refreshes user data asynchronously.
      await expect
        .poll(
          async () => {
            const u = await getUserByEmail(newEmail);
            return u?.user.email;
          },
          { timeout: 15_000, intervals: [500, 1000, 2000] }
        )
        .toBe(newEmail);

      const oldRecord = await getUserByEmail(originalEmail);
      expect(oldRecord).toBeNull();
    } finally {
      await context.close();
      await deleteUserByEmail(originalEmail);
      await deleteUserByEmail(newEmail);
    }
  });
});
