import { test, expect } from '../fixtures/test-fixtures';
import { TEST_USER } from '../fixtures/test-data';

test.describe('Login Page', () => {
  test.describe('Page rendering', () => {
    test('displays login page with correct headings and form elements', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login', { waitUntil: 'domcontentloaded' });

      // Main heading
      await expect(page.locator('h1')).toContainText('LOGIN');

      // Sub-heading
      await expect(page.locator('h2')).toContainText('Welcome Back');

      // Subtitle
      await expect(page.getByText('Sign in to your account')).toBeVisible();

      // Form fields
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#email')).toHaveAttribute('placeholder', 'Enter your email');
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('#password')).toHaveAttribute('placeholder', 'Enter your password');

      // Submit button
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    });

    test('has a hidden form for POST submission', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login', { waitUntil: 'domcontentloaded' });

      const hiddenForm = page.locator('#loginForm');
      await expect(hiddenForm).toBeAttached();
      await expect(hiddenForm).toHaveAttribute('action', '/login');
      await expect(hiddenForm).toHaveAttribute('method', 'POST');
    });

    test('has "Register here" link pointing to /signup-civ', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login', { waitUntil: 'domcontentloaded' });

      const registerLink = page.getByRole('link', { name: 'Register here' });
      await expect(registerLink).toBeVisible();
      await expect(registerLink).toHaveAttribute('href', '/signup-civ');
    });

    test('has "Forgot password?" link pointing to /forgot-password', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login', { waitUntil: 'domcontentloaded' });

      const forgotLink = page.getByRole('link', { name: 'Forgot password?' });
      await expect(forgotLink).toBeVisible();
      await expect(forgotLink).toHaveAttribute('href', '/forgot-password');
    });
  });

  test.describe('Client-side validation', () => {
    test('shows error when submitting with empty email', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login', { waitUntil: 'domcontentloaded' });

      // Leave email blank, fill password
      await page.locator('#password').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'Login' }).click();

      await expect(page.getByText('Please enter your email address.')).toBeVisible();
    });

    test('shows error when submitting with empty password', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login', { waitUntil: 'domcontentloaded' });

      // Fill email, leave password blank
      await page.locator('#email').fill(TEST_USER.email);
      await page.getByRole('button', { name: 'Login' }).click();

      await expect(page.getByText('Please enter your password.')).toBeVisible();
    });

    test('shows error when both fields are empty', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login', { waitUntil: 'domcontentloaded' });

      await page.getByRole('button', { name: 'Login' }).click();

      // Email validation fires first
      await expect(page.getByText('Please enter your email address.')).toBeVisible();
    });
  });

  test.describe('URL error parameters', () => {
    test('shows deactivated account message for ?error=account_deactivated', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login?error=account_deactivated', { waitUntil: 'domcontentloaded' });

      await expect(page.getByText('Account Deactivated')).toBeVisible();
      await expect(page.getByText(/Your account has been deactivated/)).toBeVisible();
    });

    test('shows invalid credentials message for ?error=authentication_failed', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login?error=authentication_failed', { waitUntil: 'domcontentloaded' });

      await expect(page.getByText('Invalid email or password')).toBeVisible();
    });
  });

  test.describe('Form submission', () => {
    test('shows loading state when form is submitted', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      // Intercept the POST to prevent actual navigation
      await page.route('**/login', (route) => {
        if (route.request().method() === 'POST') {
          // Hold the request to keep loading state visible
          // Do not fulfill or abort - just let it hang
          return;
        }
        return route.continue();
      });

      // Also block the set-redirect call
      await page.route('**/set-redirect', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      );

      await page.goto('/login', { waitUntil: 'domcontentloaded' });

      await page.locator('#email').fill(TEST_USER.email);
      await page.locator('#password').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'Login' }).click();

      await expect(page.getByText('Signing In...')).toBeVisible();
    });

    test('trims and lowercases email before submission', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      let submittedEmail = '';

      // Intercept form POST to capture submitted data
      await page.route('**/login', (route) => {
        if (route.request().method() === 'POST') {
          const body = route.request().postData();
          if (body) {
            const params = new URLSearchParams(body);
            submittedEmail = params.get('email') || '';
          }
          return route.fulfill({
            status: 302,
            headers: { Location: '/login?error=authentication_failed' },
          });
        }
        return route.continue();
      });

      await page.route('**/set-redirect', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      );

      await page.goto('/login', { waitUntil: 'domcontentloaded' });

      // Type email with uppercase and spaces
      await page.locator('#email').fill('  TestUser@Test.COM  ');
      await page.locator('#password').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'Login' }).click();

      // Wait for the POST to be intercepted
      await page.waitForTimeout(1000);

      expect(submittedEmail).toBe('testuser@test.com');
    });
  });
});
