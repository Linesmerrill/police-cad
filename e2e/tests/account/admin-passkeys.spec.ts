/**
 * Admin passkeys, end to end against the real API: Chrome's virtual
 * authenticator (CDP WebAuthn domain) stands in for Face ID / Touch ID.
 *
 * 1. An owner without two-factor opens Finance and sets up a passkey, which
 *    turns two-factor on and shows backup codes.
 * 2. Signing in again asks for the passkey instead of a code, and the
 *    passkey gets them into the console.
 *
 * Needs the test API's JWT_SECRET and WEBAUTHN_RP_ID=localhost (see
 * docker-compose.test.yml).
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  seedPasskeyOwner,
  removePasskeyOwner,
  TEST_PASSKEY_OWNER_EMAIL,
  TEST_PASSKEY_OWNER_PASSWORD,
} from '../../helpers/admin-users';

async function addVirtualAuthenticator(context: BrowserContext, page: Page) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

async function signInWithPassword(page: Page) {
  await page.goto('/admin');
  await page.locator('input[name="email"]').fill(TEST_PASSKEY_OWNER_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSKEY_OWNER_PASSWORD);
  await page.locator('button[type="submit"]').click();
}

test.describe('Admin passkeys', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.beforeAll(async () => { await seedPasskeyOwner(); });
  test.afterAll(async () => { await removePasskeyOwner(); });

  test('set up a passkey from Finance, then sign in with it', async ({ browser }) => {
    test.slow();
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await addVirtualAuthenticator(context, page);

    // No two-factor yet: password alone gets into the console.
    await signInWithPassword(page);
    await page.waitForURL('**/admin/console**', { timeout: 15_000 });

    await page.locator('#finance-tab').click();
    const gate = page.getByTestId('finance-mfa-gate');
    await expect(gate).toContainText('Turn on two-factor authentication');
    await page.getByTestId('finance-mfa-passkey-start').click();

    // Registering the first passkey turns two-factor on: backup codes, once.
    await expect(page.getByTestId('finance-mfa-backup-codes')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('finance-mfa-backup-codes').locator('span')).toHaveCount(10);
    await page.getByTestId('finance-mfa-done').click();
    await expect(gate).toBeHidden({ timeout: 15_000 });

    // Sign in again: the code step now offers the passkey first.
    await page.goto('/admin/logout');
    await signInWithPassword(page);
    await page.waitForURL('**/admin/mfa', { timeout: 15_000 });
    await expect(page.getByTestId('admin-mfa-code')).toBeHidden();
    await page.getByTestId('admin-mfa-passkey').click();
    await page.waitForURL('**/admin/console**', { timeout: 15_000 });

    // The session passed two-factor, so Finance opens without the gate.
    await page.locator('#finance-tab').click();
    await expect(page.getByTestId('finance-mfa-settings')).toBeVisible({ timeout: 15_000 });
    await expect(gate).toBeHidden();
    await context.close();
  });
});
