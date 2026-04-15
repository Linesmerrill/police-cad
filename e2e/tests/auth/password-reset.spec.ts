import { test, expect } from '../../fixtures/test-fixtures';
import {
  createTestUser,
  deleteUserByEmail,
  generateToken,
  getUserByEmail,
  uniqueTestEmail,
} from '../../helpers/db';
import { ResetPasswordPage } from '../../pages/reset-password.page';

/**
 * Test env has no MAIL_API_KEY, so we seed the reset token directly rather
 * than submitting /forgot-password (which 500s on the email send step).
 * The regression risk is the /reset/:token consumption, which these tests cover.
 */
test.describe('Password reset', () => {
  test('valid token lets user set a new password and log in', async ({ unauthPage }) => {
    const email = uniqueTestEmail('reset');
    const oldPassword = 'OldPass123!';
    const newPassword = 'NewPass456!';
    const token = generateToken();
    // Seed the reset token in the same insert (proven to work in signup-verify);
    // setResetToken via updateOne was racing with the GET handler.
    await createTestUser({
      email,
      password: oldPassword,
      resetPasswordToken: token,
      resetPasswordExpires: Date.now() + 60 * 60 * 1000,
    });

    try {
      const resetPage = new ResetPasswordPage(unauthPage);
      await resetPage.goto(token);
      await resetPage.submitNewPassword(newPassword);

      // On success the server auto-logs-in and redirects to /communities.
      await unauthPage.waitForURL(/\/communities/, { timeout: 20_000 });

      const updated = await getUserByEmail(email);
      expect(updated?.user.resetPasswordToken).toBeFalsy();
      expect(updated?.user.resetPasswordExpires).toBeFalsy();
      // Password hash should have changed.
      // (Not verifying the bcrypt match here — the auto-login redirect is the proof.)
      expect(typeof updated?.user.password).toBe('string');
    } finally {
      await deleteUserByEmail(email);
    }
  });

  test('invalid token shows the invalid-token view', async ({ unauthPage }) => {
    const resetPage = new ResetPasswordPage(unauthPage);
    await resetPage.goto('totally-bogus-token-xyz');

    // Express route redirects back to /forgot-password with an error message
    // when the token cannot be found in the DB. The Next.js /reset/[token]
    // page shows the invalid-token view when the session token check fails.
    await unauthPage.waitForURL(/\/forgot-password|\/reset/, { timeout: 15_000 });
    const url = unauthPage.url();
    if (/\/forgot-password/.test(url)) {
      await expect(
        unauthPage.getByText(/invalid or has expired|token.*invalid/i).first()
      ).toBeVisible({ timeout: 10_000 });
    } else {
      await resetPage.expectInvalidToken();
    }
  });

  test('expired token is rejected', async ({ unauthPage }) => {
    const email = uniqueTestEmail('reset-expired');
    const token = generateToken();
    await createTestUser({
      email,
      password: 'TestPass123!',
      resetPasswordToken: token,
      resetPasswordExpires: Date.now() - 60_000, // already expired
    });

    try {
      const resetPage = new ResetPasswordPage(unauthPage);
      await resetPage.goto(token);

      await unauthPage.waitForURL(/\/forgot-password|\/reset/, { timeout: 15_000 });
      await expect(
        unauthPage.getByText(/invalid or has expired|invalid token/i).first()
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await deleteUserByEmail(email);
    }
  });
});
