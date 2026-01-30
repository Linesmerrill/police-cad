import { test as base, expect, Page } from '@playwright/test';
import {
  MOCK_USER_RESPONSE,
  MOCK_SUBSCRIPTION_TIERS,
  MOCK_COMMUNITY_TIERS,
  MOCK_COMMUNITIES_RESPONSE,
  MOCK_CONTENT_CREATORS,
  MOCK_PENAL_CODES,
} from './test-data';

/** Helper class for intercepting API requests and returning mock data */
class MockApiHelper {
  constructor(private page: Page) {}

  /** Mock the /api/user/current endpoint to return an authenticated user */
  async mockUserCurrent(overrides?: Record<string, unknown>) {
    const response = overrides
      ? { ...MOCK_USER_RESPONSE, user: { ...MOCK_USER_RESPONSE.user, user: { ...MOCK_USER_RESPONSE.user.user, ...overrides } } }
      : MOCK_USER_RESPONSE;

    await this.page.route('**/api/user/current', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    );
  }

  /** Mock the /api/user/current endpoint to return 401 (not authenticated) */
  async mockUnauthenticated() {
    await this.page.route('**/api/user/current', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    );
  }

  /** Mock subscription tiers endpoint */
  async mockSubscriptionTiers() {
    await this.page.route('**/api/v1/subscription/tiers', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SUBSCRIPTION_TIERS),
      })
    );
  }

  /** Mock community tiers endpoint */
  async mockCommunityTiers() {
    await this.page.route('**/api/v1/subscription/community-tiers', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_COMMUNITY_TIERS),
      })
    );
  }

  /** Mock communities endpoint */
  async mockCommunities() {
    await this.page.route('**/api/v1/communities/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_COMMUNITIES_RESPONSE),
      })
    );
  }

  /** Mock content creators endpoint */
  async mockContentCreators() {
    await this.page.route('**/api/v1/content-creators', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CONTENT_CREATORS),
      })
    );
  }

  /** Mock penal codes endpoint */
  async mockPenalCodes() {
    await this.page.route('**/api/v1/penal-codes**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PENAL_CODES),
      })
    );
  }

  /** Block all external API requests to prevent leaking to real endpoints */
  async blockExternalApis() {
    await this.page.route('**/police-cad-app-api**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    );
  }
}

/** Extended test fixture with mock API helper */
export const test = base.extend<{ mockApi: MockApiHelper }>({
  mockApi: async ({ page }, use) => {
    const helper = new MockApiHelper(page);
    await use(helper);
  },
});

export { expect };
