import { test, expect } from '../fixtures/test-fixtures';
import { MOCK_USER_RESPONSE } from '../fixtures/test-data';

test.describe('Content Creator Me Page', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ mockApi }) => {
    await mockApi.blockExternalApis();
  });

  /** Active content creator profile mock */
  const MOCK_ACTIVE_CREATOR = {
    success: true,
    creator: {
      _id: '507f1f77bcf86cd799439041',
      displayName: 'Test Creator',
      slug: 'test-creator',
      status: 'active',
      featured: false,
      joinedAt: '2024-01-15T00:00:00.000Z',
      bio: 'I create content about Lines Police CAD',
      themeColor: '#fbbf24',
      primaryPlatform: 'twitch',
      platforms: [
        { type: 'twitch', url: 'https://twitch.tv/testcreator', handle: 'testcreator', followerCount: 5000, verifiedByAdmin: true },
        { type: 'youtube', url: 'https://youtube.com/@testcreator', handle: 'testcreator', followerCount: 12000, verifiedByAdmin: false },
      ],
      entitlements: {
        personalPlan: true,
        personalPlanFallback: false,
        currentUserPlan: 'base',
        communityPlan: {
          active: false,
        },
      },
    },
    application: null,
  };

  /** Pending application mock */
  const MOCK_PENDING_APPLICATION = {
    success: true,
    creator: null,
    application: {
      _id: '507f1f77bcf86cd799439031',
      displayName: 'Aspiring Creator',
      status: 'submitted',
      createdAt: '2024-06-01T00:00:00.000Z',
      platforms: [
        { type: 'twitch', url: 'https://twitch.tv/aspiringcreator', handle: 'aspiringcreator', followerCount: 600 },
      ],
      primaryPlatform: 'twitch',
      description: 'I want to create content for LPC',
    },
  };

  /** Rejected application mock */
  const MOCK_REJECTED_APPLICATION = {
    success: true,
    creator: null,
    application: {
      _id: '507f1f77bcf86cd799439032',
      displayName: 'Rejected Applicant',
      status: 'rejected',
      createdAt: '2024-05-01T00:00:00.000Z',
      reviewedAt: '2024-05-10T00:00:00.000Z',
      feedback: 'Insufficient follower count on provided platforms.',
      platforms: [
        { type: 'youtube', url: 'https://youtube.com/@rejected', handle: 'rejected', followerCount: 200 },
      ],
      primaryPlatform: 'youtube',
      description: 'My application',
    },
  };

  /** No application or creator profile */
  const MOCK_NO_APPLICATION = {
    success: true,
    creator: null,
    application: null,
  };

  function setupCreatorMock(page: any, mockData: any) {
    return page.route('**/api/v1/content-creator-applications/me', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData),
      })
    );
  }

  test.describe('page load and layout', () => {
    test('loads successfully for active creator', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();
      await setupCreatorMock(page, MOCK_ACTIVE_CREATOR);

      const response = await page.goto('/content-creators/me', { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('displays Creator Status heading for active creator', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();
      await setupCreatorMock(page, MOCK_ACTIVE_CREATOR);

      await page.goto('/content-creators/me', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Creator Status')).toBeVisible({ timeout: 30000 });
    });

    test('no uncaught JS errors on load', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();
      await setupCreatorMock(page, MOCK_ACTIVE_CREATOR);

      const errors: string[] = [];
      page.on('pageerror', (err: Error) => errors.push(err.message));

      await page.goto('/content-creators/me', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Creator Status')).toBeVisible({ timeout: 30000 });

      expect(errors).toEqual([]);
    });
  });

  test.describe('active creator profile', () => {
    test.beforeEach(async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();
      await setupCreatorMock(page, MOCK_ACTIVE_CREATOR);
      await page.goto('/content-creators/me', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Creator Status')).toBeVisible({ timeout: 30000 });
    });

    test('displays the creator display name', async ({ page }) => {
      await expect(page.getByText('Test Creator').first()).toBeVisible();
    });

    test('shows Active status', async ({ page }) => {
      await expect(page.getByText('Active').first()).toBeVisible();
    });

    test('displays platform information', async ({ page }) => {
      await expect(page.getByText(/twitch/i).first()).toBeVisible();
    });
  });

  test.describe('pending application', () => {
    test.beforeEach(async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();
      await setupCreatorMock(page, MOCK_PENDING_APPLICATION);
      await page.goto('/content-creators/me', { waitUntil: 'domcontentloaded' });
      // Wait for the page to load past the loading spinner
      await expect(page.getByText('Aspiring Creator').first()).toBeVisible({ timeout: 30000 });
    });

    test('displays the application status as Submitted', async ({ page }) => {
      await expect(page.getByText('Submitted').first()).toBeVisible();
    });

    test('displays the applicant display name', async ({ page }) => {
      await expect(page.getByText('Aspiring Creator').first()).toBeVisible();
    });
  });

  test.describe('rejected application', () => {
    test('displays Rejected status', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();
      await setupCreatorMock(page, MOCK_REJECTED_APPLICATION);

      await page.goto('/content-creators/me', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Rejected').first()).toBeVisible({ timeout: 30000 });
    });

    test('displays rejection reason', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();
      await setupCreatorMock(page, MOCK_REJECTED_APPLICATION);

      await page.goto('/content-creators/me', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(/insufficient follower count/i)).toBeVisible({ timeout: 30000 });
    });
  });

  test.describe('no application state', () => {
    test('shows message about not having applied', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();
      await setupCreatorMock(page, MOCK_NO_APPLICATION);

      await page.goto('/content-creators/me', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(/haven.*t applied/i)).toBeVisible({ timeout: 30000 });
    });
  });

  test.describe('warned creator', () => {
    test('shows Warning status for warned creator', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      const warnedCreator = {
        success: true,
        creator: {
          ...MOCK_ACTIVE_CREATOR.creator,
          status: 'warned',
          warnedAt: '2024-07-01T00:00:00.000Z',
          warningMessage: 'Follower count dropped below minimum threshold.',
        },
        application: null,
      };

      await setupCreatorMock(page, warnedCreator);

      await page.goto('/content-creators/me', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Warning').first()).toBeVisible({ timeout: 30000 });
    });
  });

  test.describe('removed creator', () => {
    test('shows removed status message', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      const removedCreator = {
        success: true,
        creator: {
          ...MOCK_ACTIVE_CREATOR.creator,
          status: 'removed',
        },
        application: null,
      };

      await setupCreatorMock(page, removedCreator);

      await page.goto('/content-creators/me', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(/removed from the Content Creator Program/i)).toBeVisible({ timeout: 30000 });
    });
  });

  test.describe('authentication guard', () => {
    test('shows sign-in prompt when user is not authenticated', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();

      await page.route('**/api/v1/content-creator-applications/me', (route) =>
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({}),
        })
      );

      await page.goto('/content-creators/me', { waitUntil: 'domcontentloaded' });

      // The page shows "Sign In Required" / "Please sign in to view your creator status."
      await expect(page.getByText(/sign in/i).first()).toBeVisible({ timeout: 30000 });
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
          body: JSON.stringify(MOCK_NO_APPLICATION),
        })
      );

      await page.route('**/police-cad-app-api**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        })
      );

      await page.goto('/content-creators/me', { waitUntil: 'domcontentloaded' });
      // Wait for page to show content (not loading spinner)
      await expect(page.getByText(/haven.*t applied/i)).toBeVisible({ timeout: 30000 });

      expect(apiCalled).toBe(true);
    });

    test('checks creator/application status on load', async ({ page, mockApi }) => {
      await mockApi.mockUserCurrent();

      let applicationCheckCalled = false;
      await page.route('**/api/v1/content-creator-applications/me', (route) => {
        applicationCheckCalled = true;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_ACTIVE_CREATOR),
        });
      });

      await page.goto('/content-creators/me', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Creator Status')).toBeVisible({ timeout: 30000 });

      expect(applicationCheckCalled).toBe(true);
    });
  });
});
