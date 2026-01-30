import { test, expect } from '../fixtures/test-fixtures';
import { TEST_USER } from '../fixtures/test-data';

test.describe('Forgot Password Page', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();
  });

  test.describe('Page rendering', () => {
    test('displays forgot password page with correct headings', async ({ page }) => {
      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('h1')).toContainText('FORGOT PASSWORD');
      await expect(page.locator('h2')).toContainText('Reset Your Password');
      await expect(page.getByText(/send you a link to reset your password/i)).toBeVisible();
    });

    test('displays email field with correct attributes', async ({ page }) => {
      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

      const emailField = page.locator('#email');
      await expect(emailField).toBeVisible();
      await expect(emailField).toHaveAttribute('type', 'email');
      await expect(emailField).toHaveAttribute('placeholder', 'Enter your email');
    });

    test('displays submit button with "Send Reset Link" text', async ({ page }) => {
      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible();
    });

    test('has "Back to Login" link pointing to /login', async ({ page }) => {
      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

      const backLink = page.getByRole('link', { name: 'Back to Login' });
      await expect(backLink).toBeVisible();
      await expect(backLink).toHaveAttribute('href', '/login');
    });

    test('has "Back to Home" link pointing to /', async ({ page }) => {
      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

      const homeLink = page.getByRole('link', { name: 'Back to Home' });
      await expect(homeLink).toBeVisible();
      await expect(homeLink).toHaveAttribute('href', '/');
    });
  });

  test.describe('Client-side validation', () => {
    test('shows error when submitting with empty email', async ({ page }) => {
      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

      await page.getByRole('button', { name: 'Send Reset Link' }).click();

      await expect(page.getByText('Please enter your email address.')).toBeVisible();
    });

    test('shows error for invalid email format', async ({ page }) => {
      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

      await page.locator('#email').fill('notavalidemail');
      await page.getByRole('button', { name: 'Send Reset Link' }).click();

      await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
    });
  });

  test.describe('Form submission', () => {
    test('submits the form via POST to /forgot-password', async ({ page }) => {
      let formSubmitted = false;

      await page.route('**/forgot-password', (route) => {
        if (route.request().method() === 'POST') {
          formSubmitted = true;
          return route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<html><body>Reset link sent</body></html>',
          });
        }
        return route.continue();
      });

      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

      await page.locator('#email').fill(TEST_USER.email);
      await page.getByRole('button', { name: 'Send Reset Link' }).click();

      // Wait for the form submission
      await page.waitForTimeout(1000);
      expect(formSubmitted).toBe(true);
    });

    test('shows loading state while submitting', async ({ page }) => {
      // Intercept the POST to hold the request
      await page.route('**/forgot-password', (route) => {
        if (route.request().method() === 'POST') {
          // Do not fulfill - keep the request pending
          return;
        }
        return route.continue();
      });

      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

      await page.locator('#email').fill(TEST_USER.email);
      await page.getByRole('button', { name: 'Send Reset Link' }).click();

      await expect(page.getByText('Sending...')).toBeVisible();
    });

    test('trims and lowercases email before submission', async ({ page }) => {
      let submittedEmail = '';

      await page.route('**/forgot-password', (route) => {
        if (route.request().method() === 'POST') {
          const body = route.request().postData();
          if (body) {
            const params = new URLSearchParams(body);
            submittedEmail = params.get('email') || '';
          }
          return route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<html><body>Done</body></html>',
          });
        }
        return route.continue();
      });

      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

      await page.locator('#email').fill('  TestUser@EXAMPLE.COM  ');
      await page.getByRole('button', { name: 'Send Reset Link' }).click();

      await page.waitForTimeout(1000);
      expect(submittedEmail).toBe('testuser@example.com');
    });
  });

  test.describe('Flash messages via query params', () => {
    test('shows success message when ?message contains reset link text', async ({ page }) => {
      await page.goto(
        '/forgot-password?message=An%20email%20has%20been%20sent%20with%20a%20reset%20link',
        { waitUntil: 'domcontentloaded' }
      );

      await expect(page.getByText(/email has been sent/i)).toBeVisible();
    });

    test('shows error message for generic ?message param', async ({ page }) => {
      await page.goto(
        '/forgot-password?message=Something%20went%20wrong',
        { waitUntil: 'domcontentloaded' }
      );

      await expect(page.getByText('Something went wrong')).toBeVisible();
    });
  });
});
