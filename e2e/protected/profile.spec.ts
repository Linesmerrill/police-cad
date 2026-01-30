import { test, expect } from '../fixtures/test-fixtures';
import { TEST_USER, MOCK_USER_RESPONSE } from '../fixtures/test-data';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.blockExternalApis();
  });

  test.describe('page load and layout', () => {
    test('loads successfully with user data', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      // Mock the creator status endpoint
      await page.route('**/api/v1/content-creator-applications/me', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, creator: null, application: null }),
        })
      );

      // Mock Cloudinary config endpoint
      await page.route('**/api/v1/cloudinary-config', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ cloudName: '', apiKey: '', uploadPreset: '' }),
        })
      );

      await page.goto('/profile');
      await expect(page).toHaveTitle(/LPC/);
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('displays the Account heading', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

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

      await page.goto('/profile');
      await expect(page.getByRole('heading', { name: /account/i })).toBeVisible();
    });

    test('displays the Account Overview section', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

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

      await page.goto('/profile');
      await expect(page.getByText('Account Overview')).toBeVisible();
    });

    test('no uncaught JS errors on load', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

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

      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      expect(errors).toEqual([]);
    });
  });

  test.describe('user information display', () => {
    test.beforeEach(async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

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

      await page.goto('/profile');
    });

    test('displays the username', async ({ page }) => {
      await expect(page.getByText(TEST_USER.username)).toBeVisible();
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
      await mockApi.mockUserCurrent({ username: 'CustomUser99' });

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

      await page.goto('/profile');
      await expect(page.getByText('CustomUser99')).toBeVisible();
    });

    test('displays overridden call sign', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent({ callSign: 'A-99' });

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

      await page.goto('/profile');
      await expect(page.getByText('A-99')).toBeVisible();
    });
  });

  test.describe('Account Settings section', () => {
    test.beforeEach(async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

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

      await page.goto('/profile');
    });

    test('displays the Account Settings heading', async ({ page }) => {
      await expect(page.getByText('Account Settings')).toBeVisible();
    });

    test('has a deactivate account option', async ({ page }) => {
      // The page contains a delete/deactivate account section
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

      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      expect(apiCalled).toBe(true);
    });
  });
});
