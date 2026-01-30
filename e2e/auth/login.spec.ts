import { test, expect } from '../fixtures/test-fixtures';
import { TEST_USER } from '../fixtures/test-data';

test.describe('Login Page', () => {
  test.setTimeout(60000);

  test.describe('Page rendering', () => {
    test('displays login page with correct headings and form elements', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login', { waitUntil: 'domcontentloaded' });

      // Main heading
      await expect(page.getByRole('heading', { level: 1 })).toContainText('LOGIN');

      // Sub-heading
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();

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
      await expect(hiddenForm).toHaveAttribute('method', /post/i);
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
    test('email field has required attribute', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('#email')).toHaveAttribute('required', '');
    });

    test('password field has required attribute', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('#password')).toHaveAttribute('required', '');
    });

    test('email and password fields accept input', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login', { waitUntil: 'domcontentloaded' });

      await page.locator('#email').fill(TEST_USER.email);
      await page.locator('#password').fill(TEST_USER.password);

      await expect(page.locator('#email')).toHaveValue(TEST_USER.email);
      await expect(page.locator('#password')).toHaveValue(TEST_USER.password);
    });
  });

  test.describe('URL error parameters', () => {
    test('shows deactivated account message for ?error=account_deactivated', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login?error=account_deactivated', { waitUntil: 'domcontentloaded' });

      // Wait for React hydration and Suspense to resolve with searchParams
      // The component uses useSearchParams() within Suspense and also a setTimeout fallback
      await expect(page.getByText('Account Deactivated')).toBeVisible({ timeout: 30000 });
      await expect(page.getByText(/Your account has been deactivated/)).toBeVisible();
    });

    test('shows invalid credentials message for ?error=authentication_failed', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login?error=authentication_failed', { waitUntil: 'domcontentloaded' });

      // Wait for React hydration and Suspense to resolve with searchParams
      await expect(page.getByText(/Invalid email or password/)).toBeVisible({ timeout: 30000 });
    });
  });

  test.describe('Form submission', () => {
    test('shows loading state when form is submitted', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      await page.goto('/login', { waitUntil: 'domcontentloaded' });

      // Wait for React to hydrate and form fields to be interactive
      await expect(page.locator('#email')).toBeVisible({ timeout: 15000 });
      // Wait for React hydration to fully complete (event handlers attached)
      await page.waitForTimeout(500);

      // The handleSubmit flow:
      // 1. setLoading(true) - React queues re-render
      // 2. submitLoginForm() called (not awaited) which does:
      //    a. await fetch('/set-redirect') with 5-second AbortController timeout
      //    b. On abort/success, calls hiddenForm.submit() which navigates the page
      //
      // To keep the "Signing In..." loading state visible, we need to:
      // 1. Hold the set-redirect request so it doesn't resolve
      // 2. Override HTMLFormElement.prototype.submit to prevent the hidden form
      //    from navigating when the AbortController fires after 5 seconds
      await page.route('**/set-redirect', () => {
        // Do not fulfill, abort, or continue - hold the request
      });

      // Override form.submit() to prevent page navigation when AbortController times out
      await page.evaluate(() => {
        HTMLFormElement.prototype.submit = function() {
          // No-op: prevent any form submission from navigating away
        };
      });

      await page.locator('#email').fill(TEST_USER.email);
      await page.locator('#password').fill(TEST_USER.password);

      // Wait a moment for React state to settle after fills
      await page.waitForTimeout(100);

      await page.getByRole('button', { name: 'Login' }).click();

      await expect(page.getByText('Signing In...')).toBeVisible({ timeout: 10000 });
    });

    test('trims and lowercases email before submission', async ({ page, mockApi }) => {
      await mockApi.mockUnauthenticated();
      await mockApi.blockExternalApis();

      let submittedEmail = '';

      await page.goto('/login', { waitUntil: 'domcontentloaded' });

      // Wait for React to hydrate
      await expect(page.locator('#email')).toBeVisible({ timeout: 15000 });
      // Wait for React hydration to fully complete (event handlers attached)
      await page.waitForTimeout(500);

      // Set up route interceptions AFTER page load to avoid interfering with initial navigation.
      // The set-redirect must resolve so handleSubmit proceeds to hiddenForm.submit().
      await page.route('**/set-redirect', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      );

      // Intercept the POST to /login to capture the submitted email.
      // Use a more specific pattern to avoid matching GET requests for login page assets.
      await page.route('**/login', (route) => {
        if (route.request().method() === 'POST') {
          const body = route.request().postData();
          if (body) {
            const params = new URLSearchParams(body);
            submittedEmail = params.get('email') || '';
          }
          return route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<html><body>Login processed</body></html>',
          });
        }
        return route.continue();
      });

      // Type email with uppercase and spaces
      await page.locator('#email').fill('  TestUser@Test.COM  ');
      await page.locator('#password').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'Login' }).click();

      // Wait for the POST to be intercepted
      await page.waitForTimeout(3000);

      expect(submittedEmail).toBe('testuser@test.com');
    });
  });
});
