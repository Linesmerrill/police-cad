import { test as setup, expect } from '@playwright/test';
import path from 'path';

const USER_STATE_PATH = path.join(__dirname, '.auth/user.json');
const ADMIN_STATE_PATH = path.join(__dirname, '.auth/admin.json');

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'testuser@test.com';
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@test.com';

setup('authenticate as regular user', async ({ page }) => {
  // Use the test login bypass route (only available when NODE_ENV=test).
  // page.request shares the cookie jar with the browser context.
  const response = await page.request.post('/test/login', {
    data: {
      email: TEST_USER_EMAIL,
    },
  });

  expect(response.ok()).toBeTruthy();

  // Set up department context so dashboard routes render instead of redirecting
  const deptResponse = await page.request.post('/test/set-department', {
    data: {
      departmentId: 'test-department-id',
      departmentName: 'Test Department',
    },
  });

  expect(deptResponse.ok()).toBeTruthy();

  await page.context().storageState({ path: USER_STATE_PATH });
});

setup('authenticate as admin', async ({ page }) => {
  // Use the test admin-login bypass route (only available when NODE_ENV=test).
  const response = await page.request.post('/test/admin-login', {
    data: {
      email: TEST_ADMIN_EMAIL,
    },
  });

  expect(response.ok()).toBeTruthy();

  await page.context().storageState({ path: ADMIN_STATE_PATH });
});
