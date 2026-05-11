import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteUserByEmail,
  deletePendingVerifications,
  getPendingVerificationCode,
  getUserByEmail,
  uniqueTestEmail,
} from '../../helpers/db';

/**
 * Verified email change is a 2-step flow:
 *   1. POST /api/v1/user/{id}/email/request-change — validates password, stores
 *      a 6-digit code in `pendingVerifications`, and emails it to the current
 *      address. The test env has no SMTP, so we read the code from Mongo.
 *   2. PUT /api/v1/user/{id}/email — submits the code, applies the change,
 *      and fires off a notice email to the old address.
 */
test.describe('Email change (verified, 2-step)', { tag: '@auth' }, () => {
  test('user can change their email after entering the verification code', async ({ browser }) => {
    const originalEmail = uniqueTestEmail('email-old');
    const newEmail = uniqueTestEmail('email-new');
    const password = 'TestPass123!';
    const userId = await createTestUser({ email: originalEmail, password });

    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    try {
      // Log in.
      await page.goto('/login');
      await page.locator('#email').fill(originalEmail);
      await page.locator('#password').fill(password);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/communities**', { timeout: 15_000 });

      // Open profile → Change Email modal (request step).
      await page.goto('/profile');
      await expect(page.getByText('Account Overview')).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: /Change Email/i }).click();

      // Fill new email + current password and click "Send Code".
      const emailField = page.locator('input[type="email"]').last();
      await emailField.waitFor({ state: 'visible', timeout: 10_000 });
      await emailField.fill(newEmail);
      await page.locator('input[type="password"]').last().fill(password);
      await page.getByRole('button', { name: /Send Code/i }).click();

      // The modal flips to confirm step. Wait for the code row to land in Mongo, then read it.
      await expect
        .poll(
          async () => {
            const row = await getPendingVerificationCode(userId, 'email_change');
            return row?.code ?? null;
          },
          { timeout: 10_000, intervals: [200, 400, 800] }
        )
        .toMatch(/^\d{6}$/);
      const pending = await getPendingVerificationCode(userId, 'email_change');
      expect(pending?.code).toMatch(/^\d{6}$/);

      // Enter the code and confirm.
      await page.locator('input[autocomplete="one-time-code"]').fill(pending!.code);
      await page.getByRole('button', { name: /Confirm Change/i }).click();

      // Poll the DB for the email update.
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
      await deletePendingVerifications(userId);
      await deleteUserByEmail(originalEmail);
      await deleteUserByEmail(newEmail);
    }
  });
});
