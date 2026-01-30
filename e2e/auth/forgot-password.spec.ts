import { test, expect } from '../fixtures/test-fixtures';
import { TEST_USER } from '../fixtures/test-data';

test.describe('Forgot Password Page', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();
  });

  test.describe('Page rendering', () => {
    test('displays forgot password page with correct headings', async ({ page }) => {
      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('heading', { level: 1 })).toContainText('FORGOT PASSWORD');
      await expect(page.getByRole('heading', { name: 'Reset Your Password' })).toBeVisible();
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

      // Wait for form to be interactive
      await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible({ timeout: 15000 });
      // Wait for React hydration to fully complete
      await page.waitForTimeout(500);

      // The email field has required attribute; use JavaScript to bypass HTML5 validation
      await page.locator('#email').evaluate((el: HTMLInputElement) => el.removeAttribute('required'));
      await page.getByRole('button', { name: 'Send Reset Link' }).click();

      await expect(page.getByText('Please enter your email address.')).toBeVisible({ timeout: 10000 });
    });

    test('shows error for invalid email format', async ({ page }) => {
      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

      // Wait for form to be interactive
      await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible({ timeout: 15000 });
      // Wait for React hydration to complete
      await page.waitForTimeout(500);

      // Fill the email field with an invalid value
      await page.locator('#email').fill('notavalidemail');
      await page.waitForTimeout(200);

      // Remove required and type=email AND submit form in a single evaluate() call.
      // This prevents React from re-rendering and resetting type=email between our
      // DOM modification and the form submission.
      await page.evaluate(() => {
        const emailEl = document.getElementById('email') as HTMLInputElement;
        if (emailEl) {
          emailEl.removeAttribute('required');
          emailEl.type = 'text';
        }
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      });

      await expect(page.getByText('Please enter a valid email address.')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Form submission', () => {
    test('submits the form via POST to /forgot-password', async ({ page }) => {
      let formSubmitted = false;

      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

      // Wait for form to be interactive
      await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible({ timeout: 15000 });
      // Wait for React hydration to fully complete
      await page.waitForTimeout(500);

      // Set up route intercept AFTER page load
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

      await page.locator('#email').fill(TEST_USER.email);
      await page.getByRole('button', { name: 'Send Reset Link' }).click();

      // Wait for the form submission (dynamic form creation + submit)
      await page.waitForTimeout(3000);
      expect(formSubmitted).toBe(true);
    });

    test('shows loading state while submitting', async ({ page }) => {
      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

      // Wait for form to be interactive
      await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible({ timeout: 15000 });
      // Wait for React hydration to fully complete
      await page.waitForTimeout(500);

      // The handleSubmit flow:
      // 1. setLoading(true) - React queues re-render
      // 2. Creates a dynamic form element
      // 3. Calls submitForm.submit() - causes synchronous full-page navigation
      //
      // The form.submit() causes navigation BEFORE React re-renders with "Sending...".
      // To test the loading state, we need to prevent the dynamic form from being submitted.
      // We'll override document.createElement to intercept the dynamic form creation
      // and prevent its submit() from actually navigating.
      await page.evaluate(() => {
        const originalCreateElement = document.createElement.bind(document);
        document.createElement = function(tagName: string, options?: ElementCreationOptions) {
          const el = originalCreateElement(tagName, options);
          if (tagName.toLowerCase() === 'form') {
            // Override submit to prevent navigation
            el.submit = () => {
              // No-op: prevent the dynamic form from navigating away
            };
          }
          return el;
        };
      });

      await page.locator('#email').fill(TEST_USER.email);
      await page.getByRole('button', { name: 'Send Reset Link' }).click();

      await expect(page.getByText('Sending...')).toBeVisible({ timeout: 10000 });
    });

    test('trims and lowercases email before submission', async ({ page }) => {
      let submittedEmail = '';

      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

      // Wait for form to be interactive
      await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible({ timeout: 15000 });
      // Wait for React hydration to fully complete
      await page.waitForTimeout(500);

      // Set up route intercept AFTER page load
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

      // The forgot-password onChange handler does: setEmail(e.target.value.trim().toLowerCase())
      // So the React state will already be trimmed/lowercased.
      // When handleSubmit runs, it does: email.trim().toLowerCase() again.
      // The dynamic form's hidden input gets the trimmed/lowercased value.
      await page.locator('#email').fill('  TestUser@EXAMPLE.COM  ');
      await page.getByRole('button', { name: 'Send Reset Link' }).click();

      // Wait for the form submission
      await page.waitForTimeout(3000);
      expect(submittedEmail).toBe('testuser@example.com');
    });
  });

  test.describe('Flash messages via query params', () => {
    test('shows success message when ?message contains reset link text', async ({ page }) => {
      await page.goto(
        '/forgot-password?message=An%20email%20has%20been%20sent%20with%20a%20reset%20link',
        { waitUntil: 'domcontentloaded' }
      );

      // Wait for React Suspense to resolve and useSearchParams to return params
      await expect(page.getByText(/email has been sent/i)).toBeVisible({ timeout: 30000 });
    });

    test('shows error message for generic ?message param', async ({ page }) => {
      await page.goto(
        '/forgot-password?message=Something%20went%20wrong',
        { waitUntil: 'domcontentloaded' }
      );

      // Wait for React Suspense to resolve and useSearchParams to return params
      await expect(page.getByText('Something went wrong')).toBeVisible({ timeout: 30000 });
    });
  });
});
