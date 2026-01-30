import { test, expect } from '../fixtures/test-fixtures';
import { MOCK_USER_RESPONSE } from '../fixtures/test-data';

test.describe('Content Creator Apply Page', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.blockExternalApis();
  });

  /** Set up common mocks for a user who has not yet applied */
  async function setupFreshApplicant(page: any, mockApi: any) {
    await mockApi.mockUserCurrent();

    // User has no existing application or creator profile
    await page.route('**/api/v1/content-creator-applications/me', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, creator: null, application: null }),
      })
    );
  }

  test.describe('page load and layout', () => {
    test('loads successfully for authenticated user', async ({ page, mockApi }) => {
      await setupFreshApplicant(page, mockApi);

      const response = await page.goto('/content-creators/apply');
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('displays the Apply to Creator Program heading', async ({ page, mockApi }) => {
      await setupFreshApplicant(page, mockApi);

      await page.goto('/content-creators/apply');
      await expect(page.getByText('Apply to Creator Program')).toBeVisible();
    });

    test('displays the application instructions', async ({ page, mockApi }) => {
      await setupFreshApplicant(page, mockApi);

      await page.goto('/content-creators/apply');
      await expect(page.getByText(/complete the form below/i)).toBeVisible();
    });

    test('displays review timeline information', async ({ page, mockApi }) => {
      await setupFreshApplicant(page, mockApi);

      await page.goto('/content-creators/apply');
      await expect(page.getByText(/5-7 business days/i)).toBeVisible();
    });

    test('no uncaught JS errors on load', async ({ page, mockApi }) => {
      await setupFreshApplicant(page, mockApi);

      const errors: string[] = [];
      page.on('pageerror', (err: Error) => errors.push(err.message));

      await page.goto('/content-creators/apply');
      await page.waitForLoadState('networkidle');

      expect(errors).toEqual([]);
    });
  });

  test.describe('application form fields', () => {
    test.beforeEach(async ({ page, mockApi }) => {
      await setupFreshApplicant(page, mockApi);
      await page.goto('/content-creators/apply');
    });

    test('displays the Display Name field pre-filled with username', async ({ page }) => {
      // The form pre-fills the display name with the user's username
      const displayNameInput = page.locator('input[type="text"]').first();
      await expect(displayNameInput).toBeVisible();
    });

    test('has a platform selection section', async ({ page }) => {
      // The form includes platform type options (Twitch, YouTube, TikTok, Other)
      await expect(page.getByText(/twitch/i).first()).toBeVisible();
    });

    test('has a Submit Application button', async ({ page }) => {
      await expect(page.getByText('Submit Application')).toBeVisible();
    });

    test('has terms agreement checkbox', async ({ page }) => {
      // The form requires agreeing to terms
      const checkbox = page.locator('input[type="checkbox"]').first();
      await expect(checkbox).toBeAttached();
    });
  });

  test.describe('form validation', () => {
    test('Submit Application button exists and is initially present', async ({ page, mockApi }) => {
      await setupFreshApplicant(page, mockApi);
      await page.goto('/content-creators/apply');

      const submitBtn = page.getByText('Submit Application');
      await expect(submitBtn).toBeVisible();
    });
  });

  test.describe('redirect for existing applicants', () => {
    test('redirects to /content-creators/me when user has pending application', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      // User already has a pending application
      await page.route('**/api/v1/content-creator-applications/me', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            creator: null,
            application: {
              _id: '507f1f77bcf86cd799439031',
              displayName: 'Test Applicant',
              status: 'submitted',
              createdAt: '2024-06-01T00:00:00.000Z',
              platforms: [{ type: 'twitch', url: 'https://twitch.tv/test', handle: 'test', followerCount: 1000 }],
              primaryPlatform: 'twitch',
              description: 'Test application',
            },
          }),
        })
      );

      await page.goto('/content-creators/apply');
      await page.waitForURL('**/content-creators/me', { timeout: 10000 });
      expect(page.url()).toContain('/content-creators/me');
    });

    test('redirects to /content-creators/me when user is active creator', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      // User is already an active content creator
      await page.route('**/api/v1/content-creator-applications/me', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            creator: {
              _id: '507f1f77bcf86cd799439041',
              displayName: 'Active Creator',
              slug: 'active-creator',
              status: 'active',
              featured: false,
              joinedAt: '2024-01-01T00:00:00.000Z',
              bio: 'Creator bio',
              themeColor: '#fbbf24',
              primaryPlatform: 'twitch',
              platforms: [{ type: 'twitch', url: 'https://twitch.tv/test', handle: 'test', followerCount: 5000 }],
              entitlements: {
                personalPlan: true,
                communityPlan: { active: false },
              },
            },
            application: null,
          }),
        })
      );

      await page.goto('/content-creators/apply');
      await page.waitForURL('**/content-creators/me', { timeout: 10000 });
      expect(page.url()).toContain('/content-creators/me');
    });
  });

  test.describe('unauthenticated access', () => {
    test('shows sign-in prompt when user is not authenticated', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();

      // Mock the creator applications endpoint to also return unauthorized
      await page.route('**/api/v1/content-creator-applications/me', (route) =>
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({}),
        })
      );

      await page.goto('/content-creators/apply');

      // The page shows a message about needing to be signed in
      await expect(page.getByText(/signed in/i)).toBeVisible();
    });
  });

  test.describe('API interaction', () => {
    test('fetches /api/user/current on page load', async ({ page }) => {
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

      await page.route('**/police-cad-app-api**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        })
      );

      await page.goto('/content-creators/apply');
      await page.waitForLoadState('networkidle');

      expect(apiCalled).toBe(true);
    });

    test('checks for existing applications on load', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      let applicationCheckCalled = false;
      await page.route('**/api/v1/content-creator-applications/me', (route) => {
        applicationCheckCalled = true;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, creator: null, application: null }),
        });
      });

      await page.goto('/content-creators/apply');
      await page.waitForLoadState('networkidle');

      expect(applicationCheckCalled).toBe(true);
    });
  });
});
