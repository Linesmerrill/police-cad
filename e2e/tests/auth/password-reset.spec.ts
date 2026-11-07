import { test, expect } from '../../fixtures/test-fixtures';
import {
  createTestUser,
  deleteUserByEmail,
  generateToken,
  getUserByEmail,
  uniqueTestEmail,
} from '../../helpers/db';
import { ResetPasswordPage } from '../../pages/reset-password.page';
import crypto from 'crypto';

/**
 * The stored form of a reset token. Written out with crypto here rather than
 * imported from app/reset-token.js on purpose: if the two ever disagree, this
 * is where it shows up.
 */
function storedForm(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** 32 bytes of hex — the shape both the site and the console now email. */
function generateModernToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Test env has no MAIL_API_KEY, so we seed the reset token directly rather
 * than submitting /forgot-password (which 500s on the email send step).
 * The regression risk is the /reset/:token consumption, which these tests cover.
 */
test.describe('Password reset', () => {
  /**
   * The format every reset link now carries: the raw token in the URL, only
   * sha256(token) on the account. This is the path the admin console's
   * "Send reset email" produces, so it is the one that has to get a member
   * from a dead link to being logged in.
   */
  test('a hashed token lets the user set a new password and log in', async ({ unauthPage }) => {
    const email = uniqueTestEmail('reset-hashed');
    const newPassword = 'NewPass456!';
    const token = generateModernToken();
    await createTestUser({
      email,
      password: 'OldPass123!',
      resetPasswordToken: storedForm(token),
      resetPasswordExpires: Date.now() + 60 * 60 * 1000,
    });

    try {
      const resetPage = new ResetPasswordPage(unauthPage);
      await resetPage.goto(token);
      await resetPage.submitNewPassword(newPassword);

      // Same caveat as the legacy case below: with no MAIL_API_KEY the
      // confirmation-email step errors after the password is already written,
      // so assert the outcome from the DB and a fresh login.
      await unauthPage.waitForURL(/\/communities|\/forgot-password|\/reset/, {
        timeout: 20_000,
      });

      await expect
        .poll(
          async () => {
            const u = await getUserByEmail(email);
            return u?.user.resetPasswordToken ?? null;
          },
          { timeout: 10_000, intervals: [500, 1000, 2000] }
        )
        .toEqual(null);

      await unauthPage.goto('/login');
      await unauthPage.locator('#email').fill(email);
      await unauthPage.locator('#password').fill(newPassword);
      await unauthPage.locator('button[type="submit"]').click();
      await unauthPage.waitForURL('**/communities**', { timeout: 15_000 });
    } finally {
      await deleteUserByEmail(email);
    }
  });

  /**
   * The stored value and the supplied token share one field, so a raw-token
   * fallback that did not check the shape would mean handing someone the
   * stored hash opened the account. A 64-character token is only ever matched
   * by its own hash.
   */
  test('the stored hash cannot be replayed as the token', async ({ unauthPage }) => {
    const email = uniqueTestEmail('reset-replay');
    const token = generateModernToken();
    const stored = storedForm(token);
    await createTestUser({
      email,
      password: 'OldPass123!',
      resetPasswordToken: stored,
      resetPasswordExpires: Date.now() + 60 * 60 * 1000,
    });

    try {
      const resetPage = new ResetPasswordPage(unauthPage);
      await resetPage.goto(stored);

      await unauthPage.waitForURL(/\/forgot-password|\/reset/, { timeout: 15_000 });
      const url = unauthPage.url();
      if (/\/forgot-password/.test(url)) {
        await expect(
          unauthPage.getByText(/invalid or has expired|token.*invalid/i).first()
        ).toBeVisible({ timeout: 10_000 });
      } else {
        await resetPage.expectInvalidToken();
      }

      // The account is untouched: the token is still outstanding.
      const after = await getUserByEmail(email);
      expect(after?.user.resetPasswordToken).toEqual(stored);
    } finally {
      await deleteUserByEmail(email);
    }
  });

  /**
   * Links already in inboxes when the hashing change deployed carry a raw
   * 40-hex token. They keep working until they expire.
   */
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

      // The server auto-login + redirect to /communities happens *after* a
      // confirmation email send. With no MAIL_API_KEY in the test env that
      // step errors and the waterfall lands on /forgot-password — but the
      // password update itself succeeded. Wait for the URL to settle, then
      // assert the actual outcome via DB + a fresh login.
      await unauthPage.waitForURL(/\/communities|\/forgot-password|\/reset/, {
        timeout: 20_000,
      });

      // Poll the DB — the user.save in the route is async w.r.t. the redirect.
      await expect
        .poll(
          async () => {
            const u = await getUserByEmail(email);
            return {
              token: u?.user.resetPasswordToken ?? null,
              expires: u?.user.resetPasswordExpires ?? null,
            };
          },
          { timeout: 10_000, intervals: [500, 1000, 2000] }
        )
        .toEqual({ token: null, expires: null });

      // Final proof: the new password works for login.
      await unauthPage.goto('/login');
      await unauthPage.locator('#email').fill(email);
      await unauthPage.locator('#password').fill(newPassword);
      await unauthPage.locator('button[type="submit"]').click();
      await unauthPage.waitForURL('**/communities**', { timeout: 15_000 });
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
