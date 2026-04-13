import { test, expect } from '../../fixtures/test-fixtures';

const protectedRoutes = [
  '/civ-dashboard',
  '/police-dashboard',
  '/ems-dashboard',
  '/dispatch-dashboard',
  '/command-dashboard',
  '/department-dashboard',
  '/community-dashboard',
];

test.describe('Auth Redirects', () => {
  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated users to login`, async ({ unauthPage }) => {
      await unauthPage.goto(route);
      await expect(unauthPage).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  }
});
