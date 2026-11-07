import { test, expect, Page } from '@playwright/test';
import {
  seedPasswordHelpStaff,
  removePasswordHelpStaff,
  TEST_PASSWORD_HELP_STAFF_EMAIL,
  TEST_PASSWORD_HELP_STAFF_PASSWORD,
} from '../../helpers/admin-users';

/**
 * Staff password help on the Users panel.
 *
 * A member reported never getting a reset email, staff pressed the console's
 * button for him, and it reported success while sending a link that could not
 * have worked. These tests cover the staff-facing half: the facts staff read
 * before deciding anything, and that the button now tells the truth about
 * whether the email went out.
 *
 * The API is stubbed with page.route — this exercises the panel, not Go.
 *
 * Uses its own admin_users row rather than the shared console-staff fixture:
 * that row is seeded and deleted by four spec files, and under fullyParallel
 * the first to finish deletes it while the others are still logging in.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const MEMBER_ID = '507f1f77bcf86cd799439021';
const MEMBER_EMAIL = 'locked-out@example.test';

async function loginAsPasswordHelpStaff(page: Page) {
  await page.goto('/admin');
  await page.locator('input[name="email"]').fill(TEST_PASSWORD_HELP_STAFF_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD_HELP_STAFF_PASSWORD);
  await Promise.all([
    page.waitForURL('**/admin/console**', { timeout: 15_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
}

/** Stub the member the console looks up, with whatever password facts the test needs. */
async function stubMember(page: Page, details: Record<string, unknown>) {
  await page.route(`**/api/v1/admin/users/${MEMBER_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: MEMBER_ID,
          email: MEMBER_EMAIL,
          username: 'locked_out',
          isDeactivated: false,
          createdAt: '2026-01-04T10:00:00Z',
          communitiesCount: 1,
          ...details,
        },
      }),
    });
  });
}

/** Search by member id — the console's exact-lookup path renders a single card. */
async function findTheMember(page: Page) {
  await page.locator('.ac-nav-item[data-panel="users"]').click();
  await page.locator('#userSearch').fill(MEMBER_ID);
  await page.locator('#searchUsersBtn').click();
  await expect(page.locator(`[data-reset-user-id="${MEMBER_ID}"]`)).toBeVisible({
    timeout: 15_000,
  });
}

test.describe('Admin → staff password help', { tag: '@admin' }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await seedPasswordHelpStaff();
  });

  test.afterAll(async () => {
    await removePasswordHelpStaff();
  });

  test.beforeEach(async ({ page }) => {
    await loginAsPasswordHelpStaff(page);
  });

  test('shows the last password change and the last reset email', async ({ page }) => {
    await stubMember(page, {
      passwordChangedAt: '2026-03-02T09:30:00Z',
      lastResetEmailAt: '2026-11-01T14:05:00Z',
      lastResetEmailBy: 'Dana Reed',
    });
    await findTheMember(page);

    await expect(page.locator(`.password-changed-${MEMBER_ID}`)).not.toHaveText(
      /Loading|Never recorded/,
      { timeout: 15_000 }
    );
    // Rendered in the browser's locale, so assert the parts rather than a format.
    await expect(page.locator(`.password-changed-${MEMBER_ID}`)).toContainText('2026');
    await expect(page.locator(`.last-reset-email-${MEMBER_ID}`)).toContainText(
      'by Dana Reed'
    );
    await expect(page.getByText('Last password change').first()).toBeVisible();
    await expect(page.getByText('Last reset email').first()).toBeVisible();
  });

  test('says "Never recorded" for an account with no history', async ({ page }) => {
    // Every existing account looks like this until it next changes a password.
    await stubMember(page, {});
    await findTheMember(page);

    await expect(page.locator(`.password-changed-${MEMBER_ID}`)).toHaveText(
      'Never recorded',
      { timeout: 15_000 }
    );
    await expect(page.locator(`.last-reset-email-${MEMBER_ID}`)).toHaveText(
      'Never recorded',
      { timeout: 15_000 }
    );
  });

  test('attributes a member-initiated reset to the member', async ({ page }) => {
    await stubMember(page, {
      lastResetEmailAt: '2026-11-01T14:05:00Z',
      lastResetEmailBy: 'Member',
    });
    await findTheMember(page);

    await expect(page.locator(`.last-reset-email-${MEMBER_ID}`)).toContainText(
      'by Member',
      { timeout: 15_000 }
    );
  });

  test('sending a reset email goes through our own server and confirms', async ({ page }) => {
    await stubMember(page, {});
    await findTheMember(page);

    // The request must reach the admin-gated proxy, never the API directly:
    // the API needs the gateway secret and the acting admin from the session.
    const proxied = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        req.url().includes(`/admin/api/users/${MEMBER_ID}/reset-password`)
    );
    await page.route(`**/admin/api/users/${MEMBER_ID}/reset-password`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'reset email sent' }),
      });
    });

    await page.locator(`[data-reset-user-id="${MEMBER_ID}"]`).click();
    // The confirm copy is what tells staff they will not see the password.
    await expect(page.locator('#confirmModalBody')).toContainText(
      `Send a reset email to ${MEMBER_EMAIL}? They choose the new password. You won't see it.`
    );
    await page.locator('#confirmModalBtn').click();

    await proxied;
    await expect(page.locator('.toast-notification')).toContainText('Reset email sent.', {
      timeout: 15_000,
    });
    // Staff never see the link or the token: the only thing the send reports
    // back is whether it went out.
    await expect(page.locator('.toast-notification')).not.toContainText('/reset/');
  });

  test('a failed send says so instead of reporting success', async ({ page }) => {
    // The original report: staff saw "sent" when nothing was sent.
    await stubMember(page, {});
    await findTheMember(page);

    await page.route(`**/admin/api/users/${MEMBER_ID}/reset-password`, async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'failed to send reset email' }),
      });
    });

    await page.locator(`[data-reset-user-id="${MEMBER_ID}"]`).click();
    await page.locator('#confirmModalBtn').click();

    await expect(page.locator('.toast-notification')).toContainText(
      "Couldn't send the reset email.",
      { timeout: 15_000 }
    );
  });

  test('the panel offers no way to set or see a password', async ({ page }) => {
    await stubMember(page, {});
    await findTheMember(page);

    await expect(page.locator('#panel-users input[type="password"]')).toHaveCount(0);
    await expect(page.locator('#panel-users')).not.toContainText(/temporary password/i);
    await expect(page.locator('#panel-users')).not.toContainText(/set password/i);
  });
});
