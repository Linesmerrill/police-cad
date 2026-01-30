import { test, expect } from '../fixtures/test-fixtures';
import { TEST_USER, MOCK_USER_RESPONSE } from '../fixtures/test-data';

test.describe('Profile Page', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ mockApi }) => {
    await mockApi.blockExternalApis();
  });

  /** Common mocks needed for the profile page to load fully */
  async function setupProfileMocks(page: any, mockApi: any, userOverrides?: Record<string, unknown>) {
    await mockApi.mockUserCurrent(userOverrides);

    await page.route('**/api/v1/content-creator-applications/me', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, creator: null, application: null }),
      })
    );

    await page.route('**/api/v1/cloudinary-config', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ cloudName: '', apiKey: '', uploadPreset: '' }),
      })
    );
  }

  /** Navigate to profile and wait for content to load (past the "Loading..." state) */
  async function gotoProfile(page: any) {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    // Wait for the page to finish loading user data (the "Account Overview" section appears)
    await expect(page.getByText('Account Overview')).toBeVisible({ timeout: 30000 });
  }

  test.describe('page load and layout', () => {
    test('loads successfully with user data', async ({ page, mockApi }) => {
      await setupProfileMocks(page, mockApi);
      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('displays the Account heading', async ({ page, mockApi }) => {
      await setupProfileMocks(page, mockApi);
      await gotoProfile(page);
      // The page has "Account Overview" and "Account Settings" headings
      await expect(page.getByText('Account Overview')).toBeVisible();
    });

    test('displays the Account Overview section', async ({ page, mockApi }) => {
      await setupProfileMocks(page, mockApi);
      await gotoProfile(page);
      await expect(page.getByText('Account Overview')).toBeVisible();
    });

    test('no uncaught JS errors on load', async ({ page, mockApi }) => {
      await setupProfileMocks(page, mockApi);

      const errors: string[] = [];
      page.on('pageerror', (err: Error) => errors.push(err.message));

      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
      // Wait for the page to settle
      await expect(page.getByText('Account Overview')).toBeVisible({ timeout: 30000 });

      expect(errors).toEqual([]);
    });
  });

  test.describe('user information display', () => {
    test.beforeEach(async ({ page, mockApi }) => {
      await setupProfileMocks(page, mockApi);
      await gotoProfile(page);
    });

    test('displays the username', async ({ page }) => {
      await expect(page.getByText(TEST_USER.username).first()).toBeVisible();
    });

    test('displays the Username label', async ({ page }) => {
      await expect(page.getByText('Username').first()).toBeVisible();
    });

    test('displays the Call Sign label', async ({ page }) => {
      await expect(page.getByText('Call Sign').first()).toBeVisible();
    });

    test('displays subscription section', async ({ page }) => {
      await expect(page.getByText(/subscription/i).first()).toBeVisible();
    });
  });

  test.describe('user with custom data', () => {
    test('displays overridden username', async ({ page, mockApi }) => {
      await setupProfileMocks(page, mockApi, { username: 'CustomUser99' });
      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('CustomUser99').first()).toBeVisible({ timeout: 30000 });
    });

    test('displays overridden call sign', async ({ page, mockApi }) => {
      await setupProfileMocks(page, mockApi, { callSign: 'A-99' });
      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('A-99').first()).toBeVisible({ timeout: 30000 });
    });
  });

  test.describe('Account Settings section', () => {
    test.beforeEach(async ({ page, mockApi }) => {
      await setupProfileMocks(page, mockApi);
      await gotoProfile(page);
    });

    test('displays the Account Settings heading', async ({ page }) => {
      await expect(page.getByText('Account Settings')).toBeVisible();
    });

    test('has a deactivate account option', async ({ page }) => {
      await expect(page.getByText(/deactivate/i).first()).toBeVisible();
    });
  });

  test.describe('authentication guard', () => {
    test('fetches /api/user/current on page load', async ({ page, mockApi }) => {
      let apiCalled = false;
      await page.route('**/api/user/current', (route) => {
        apiCalled = true;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_USER_RESPONSE),
        });
      });

      await page.route('**/api/v1/content-creator-applications/me', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, creator: null, application: null }),
        })
      );

      await page.route('**/api/v1/cloudinary-config', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ cloudName: '', apiKey: '', uploadPreset: '' }),
        })
      );

      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Account Overview')).toBeVisible({ timeout: 30000 });

      expect(apiCalled).toBe(true);
    });
  });
});
