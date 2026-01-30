import { test, expect } from '../fixtures/test-fixtures';

test.describe('Reset Password Page', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();
  });

  test.describe('Page rendering with valid token', () => {
    test('displays reset password page with correct headings', async ({ page }) => {
      // Mock the token validation endpoint to return valid
      await page.route('**/api/reset-token/validate', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: true }),
        })
      );

      // Navigate to the encryptedToken path (simulating a user who already had
      // their token validated and stored in session by Express)
      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('h1')).toContainText('RESET PASSWORD');
      await expect(page.locator('h2')).toContainText('Create New Password');
      await expect(page.getByText('Enter your new password below.')).toBeVisible();
    });

    test('displays password and confirm password fields', async ({ page }) => {
      await page.route('**/api/reset-token/validate', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: true }),
        })
      );

      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      const passwordField = page.locator('#password');
      await expect(passwordField).toBeVisible();
      await expect(passwordField).toHaveAttribute('placeholder', 'Enter new password');

      const confirmField = page.locator('#confirmPassword');
      await expect(confirmField).toBeVisible();
      await expect(confirmField).toHaveAttribute('placeholder', 'Confirm new password');
    });

    test('displays submit button with "Update Password" text', async ({ page }) => {
      await page.route('**/api/reset-token/validate', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: true }),
        })
      );

      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('button', { name: 'Update Password' })).toBeVisible();
    });

    test('has navigation links back to login and home', async ({ page }) => {
      await page.route('**/api/reset-token/validate', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: true }),
        })
      );

      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      const loginLink = page.getByRole('link', { name: 'Back to Login' });
      await expect(loginLink).toBeVisible();
      await expect(loginLink).toHaveAttribute('href', '/login');

      const homeLink = page.getByRole('link', { name: 'Back to Home' });
      await expect(homeLink).toBeVisible();
      await expect(homeLink).toHaveAttribute('href', '/');
    });
  });

  test.describe('Invalid token handling', () => {
    test('shows invalid token message when token validation fails', async ({ page }) => {
      await page.route('**/api/reset-token/validate', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: false,
            message: 'Password reset token is invalid or has expired.',
          }),
        })
      );

      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      await expect(page.getByText('Invalid Token')).toBeVisible();
      await expect(page.getByText(/invalid or has expired/)).toBeVisible();
    });

    test('shows "Request New Reset Link" button when token is invalid', async ({ page }) => {
      await page.route('**/api/reset-token/validate', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: false }),
        })
      );

      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      const resetLink = page.getByRole('link', { name: 'Request New Reset Link' });
      await expect(resetLink).toBeVisible();
      await expect(resetLink).toHaveAttribute('href', '/forgot-password');
    });

    test('shows validating state while checking token', async ({ page }) => {
      // Delay the token validation response
      await page.route('**/api/reset-token/validate', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: true }),
        });
      });

      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      await expect(page.getByText('Validating reset token...')).toBeVisible();
    });
  });

  test.describe('Password requirements', () => {
    test('shows "At least 6 characters" requirement', async ({ page }) => {
      await page.route('**/api/reset-token/validate', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: true }),
        })
      );

      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      await expect(page.getByText('At least 6 characters')).toBeVisible();
    });

    test('shows "Passwords match" indicator when confirm password has text', async ({ page }) => {
      await page.route('**/api/reset-token/validate', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: true }),
        })
      );

      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      await page.locator('#password').fill('newpassword123');
      await page.locator('#confirmPassword').fill('newpassword123');

      await expect(page.getByText('Passwords match')).toBeVisible();
    });
  });

  test.describe('Password visibility toggle', () => {
    test('password field toggles visibility', async ({ page }) => {
      await page.route('**/api/reset-token/validate', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: true }),
        })
      );

      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      const passwordField = page.locator('#password');
      await expect(passwordField).toHaveAttribute('type', 'password');

      const toggleButton = passwordField.locator('..').locator('button');
      await toggleButton.click();

      await expect(passwordField).toHaveAttribute('type', 'text');
    });
  });

  test.describe('Client-side validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/reset-token/validate', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: true }),
        })
      );
    });

    test('shows error when new password is empty', async ({ page }) => {
      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      await page.getByRole('button', { name: 'Update Password' }).click();

      await expect(page.getByText('Please enter a new password.')).toBeVisible();
    });

    test('shows error when password is less than 6 characters', async ({ page }) => {
      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      await page.locator('#password').fill('abc');
      await page.locator('#confirmPassword').fill('abc');
      await page.getByRole('button', { name: 'Update Password' }).click();

      await expect(page.getByText('Password must be at least 6 characters long.')).toBeVisible();
    });

    test('shows error when confirm password is empty', async ({ page }) => {
      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      await page.locator('#password').fill('newpassword123');
      await page.getByRole('button', { name: 'Update Password' }).click();

      await expect(page.getByText('Please confirm your password.')).toBeVisible();
    });

    test('shows error when passwords do not match', async ({ page }) => {
      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      await page.locator('#password').fill('newpassword123');
      await page.locator('#confirmPassword').fill('differentpass456');
      await page.getByRole('button', { name: 'Update Password' }).click();

      await expect(page.getByText('Passwords do not match.')).toBeVisible();
    });
  });

  test.describe('Form submission', () => {
    test('submits form via POST to /reset/encryptedToken', async ({ page }) => {
      await page.route('**/api/reset-token/validate', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: true }),
        })
      );

      let formSubmitted = false;
      let submittedPassword = '';

      await page.route('**/reset/encryptedToken', (route) => {
        if (route.request().method() === 'POST') {
          formSubmitted = true;
          const body = route.request().postData();
          if (body) {
            const params = new URLSearchParams(body);
            submittedPassword = params.get('password') || '';
          }
          return route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<html><body>Password updated</body></html>',
          });
        }
        return route.continue();
      });

      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      await page.locator('#password').fill('newpassword123');
      await page.locator('#confirmPassword').fill('newpassword123');
      await page.getByRole('button', { name: 'Update Password' }).click();

      await page.waitForTimeout(1000);
      expect(formSubmitted).toBe(true);
      expect(submittedPassword).toBe('newpassword123');
    });

    test('shows loading state while submitting', async ({ page }) => {
      await page.route('**/api/reset-token/validate', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: true }),
        })
      );

      // Hold the POST to keep loading state visible
      await page.route('**/reset/encryptedToken', (route) => {
        if (route.request().method() === 'POST') {
          return; // Do not fulfill
        }
        return route.continue();
      });

      await page.goto('/reset/encryptedToken', { waitUntil: 'domcontentloaded' });

      await page.locator('#password').fill('newpassword123');
      await page.locator('#confirmPassword').fill('newpassword123');
      await page.getByRole('button', { name: 'Update Password' }).click();

      await expect(page.getByText('Updating...')).toBeVisible();
    });
  });
});
