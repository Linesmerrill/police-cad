import { test, expect } from '../../fixtures/test-fixtures';
import {
  createTestUser,
  deleteUserByEmail,
  generateToken,
  getUserByEmail,
  uniqueTestEmail,
} from '../../helpers/db';

/**
 * Test env has no MAIL_API_KEY, so we seed the verification token directly
 * in Mongo and assert GET /signup/verify/:token consumes it correctly.
 * This is the actual regression risk — the token-consumption route.
 */
test.describe('Signup email verification', () => {
  test('valid token verifies the account and auto-logs in', async ({ unauthPage }) => {
    const email = uniqueTestEmail('verify');
    const token = generateToken();
    await createTestUser({
      email,
      password: 'TestPass123!',
      emailVerified: false,
      emailVerificationToken: token,
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
    });

    try {
      await unauthPage.goto(`/signup/verify/${token}`);

      // Route auto-logs the user in and redirects to /communities.
      await unauthPage.waitForURL(/\/communities/, { timeout: 15_000 });

      const updated = await getUserByEmail(email);
      expect(updated?.user.emailVerified).toBe(true);
      expect(updated?.user.emailVerificationToken).toBeUndefined();
    } finally {
      await deleteUserByEmail(email);
    }
  });

  test('invalid token redirects to verify page with error', async ({ unauthPage }) => {
    await unauthPage.goto('/signup/verify/not-a-real-token-0123456789');

    await expect(unauthPage).toHaveURL(/\/signup\/verify\?error=invalid_token/, {
      timeout: 15_000,
    });
    await expect(
      unauthPage.getByText(/verification link is invalid or has expired/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test('expired token is rejected', async ({ unauthPage }) => {
    const email = uniqueTestEmail('verify-expired');
    const token = generateToken();
    await createTestUser({
      email,
      password: 'TestPass123!',
      emailVerified: false,
      emailVerificationToken: token,
      emailVerificationExpires: Date.now() - 60_000, // expired 1 minute ago
    });

    try {
      await unauthPage.goto(`/signup/verify/${token}`);
      await expect(unauthPage).toHaveURL(/\/signup\/verify\?error=invalid_token/, {
        timeout: 15_000,
      });
    } finally {
      await deleteUserByEmail(email);
    }
  });
});
