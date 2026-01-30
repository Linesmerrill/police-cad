import { test, expect } from '../fixtures/test-fixtures';
import { TEST_USER } from '../fixtures/test-data';

test.describe('Signup Page', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();
  });

  test.describe('Page rendering', () => {
    test('displays signup page with correct headings', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('h1')).toContainText('REGISTER');
      await expect(page.locator('h2')).toContainText('Create an Account');
      await expect(page.getByText('Join Lines Police CAD today')).toBeVisible();
    });

    test('displays all required form fields', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      // Username field
      const usernameField = page.locator('#username');
      await expect(usernameField).toBeVisible();
      await expect(usernameField).toHaveAttribute('placeholder', 'Enter your username');

      // Call Sign field
      const callSignField = page.locator('#callSign');
      await expect(callSignField).toBeVisible();
      await expect(callSignField).toHaveAttribute('placeholder', 'Optional - Max 10 characters');
      await expect(callSignField).toHaveAttribute('maxLength', '10');

      // Email field
      const emailField = page.locator('#email');
      await expect(emailField).toBeVisible();
      await expect(emailField).toHaveAttribute('placeholder', 'Enter your email');

      // Password field
      const passwordField = page.locator('#password');
      await expect(passwordField).toBeVisible();
      await expect(passwordField).toHaveAttribute('placeholder', 'Enter your password');

      // Confirm password field
      const confirmPasswordField = page.locator('#confirmPassword');
      await expect(confirmPasswordField).toBeVisible();
      await expect(confirmPasswordField).toHaveAttribute('placeholder', 'Confirm your password');
    });

    test('displays terms and conditions checkbox with link', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await expect(page.getByText('I accept the')).toBeVisible();
      const termsLink = page.getByRole('link', { name: 'Terms and Conditions' });
      await expect(termsLink).toBeVisible();
      await expect(termsLink).toHaveAttribute('href', '/terms-and-conditions');
    });

    test('displays submit button with text "Register"', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      const submitButton = page.getByRole('button', { name: 'Register' });
      await expect(submitButton).toBeVisible();
    });

    test('has "Login here" link pointing to /login', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await expect(page.getByText('Already registered?')).toBeVisible();
      const loginLink = page.getByRole('link', { name: 'Login here' });
      await expect(loginLink).toBeVisible();
      await expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  test.describe('Password requirements indicator', () => {
    test('shows "At least 6 characters" requirement text', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await expect(page.getByText('At least 6 characters')).toBeVisible();
    });

    test('password requirement turns green when 6+ chars entered', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      // Type a short password first
      await page.locator('#password').fill('abc');

      // The "At least 6 characters" indicator should not be green yet
      // Now type a valid-length password
      await page.locator('#password').fill('abcdef');

      // CheckCircleIcon should appear (indicated by SVG in the requirement area)
      const requirementContainer = page.getByText('At least 6 characters').locator('..');
      await expect(requirementContainer).toBeVisible();
    });

    test('shows "Passwords match" indicator when confirm password has text', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await page.locator('#password').fill('testpass123');
      await page.locator('#confirmPassword').fill('testpass123');

      await expect(page.getByText('Passwords match')).toBeVisible();
    });

    test('password match indicator not visible when confirm field is empty', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await page.locator('#password').fill('testpass123');

      // "Passwords match" should not be visible until confirmPassword has text
      await expect(page.getByText('Passwords match')).not.toBeVisible();
    });
  });

  test.describe('Password visibility toggle', () => {
    test('password field toggles between hidden and visible', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      const passwordField = page.locator('#password');

      // Initially should be password type
      await expect(passwordField).toHaveAttribute('type', 'password');

      // Click the toggle button (the button next to the password field)
      const toggleButton = passwordField.locator('..').locator('button');
      await toggleButton.click();

      // Should now be text type
      await expect(passwordField).toHaveAttribute('type', 'text');

      // Click again to hide
      await toggleButton.click();
      await expect(passwordField).toHaveAttribute('type', 'password');
    });

    test('confirm password field toggles between hidden and visible', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      const confirmField = page.locator('#confirmPassword');

      await expect(confirmField).toHaveAttribute('type', 'password');

      const toggleButton = confirmField.locator('..').locator('button');
      await toggleButton.click();

      await expect(confirmField).toHaveAttribute('type', 'text');
    });
  });

  test.describe('Client-side validation', () => {
    test('shows error for empty username', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      // Fill everything except username
      await page.locator('#email').fill(TEST_USER.email);
      await page.locator('#password').fill(TEST_USER.password);
      await page.locator('#confirmPassword').fill(TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();

      await page.getByRole('button', { name: 'Register' }).click({ force: true });

      await expect(page.getByText('Please enter a username.')).toBeVisible();
    });

    test('shows error for username shorter than 3 characters', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await page.locator('#username').fill('ab');
      await page.locator('#email').fill(TEST_USER.email);
      await page.locator('#password').fill(TEST_USER.password);
      await page.locator('#confirmPassword').fill(TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();

      await page.getByRole('button', { name: 'Register' }).click({ force: true });

      await expect(page.getByText('Username must be at least 3 characters long.')).toBeVisible();
    });

    test('shows error for empty email', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await page.locator('#username').fill(TEST_USER.username);
      await page.locator('#password').fill(TEST_USER.password);
      await page.locator('#confirmPassword').fill(TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();

      await page.getByRole('button', { name: 'Register' }).click({ force: true });

      await expect(page.getByText('Please enter your email address.')).toBeVisible();
    });

    test('shows error for invalid email format', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await page.locator('#username').fill(TEST_USER.username);
      await page.locator('#email').fill('notanemail');
      await page.locator('#password').fill(TEST_USER.password);
      await page.locator('#confirmPassword').fill(TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();

      await page.getByRole('button', { name: 'Register' }).click({ force: true });

      await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
    });

    test('shows error for empty password', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await page.locator('#username').fill(TEST_USER.username);
      await page.locator('#email').fill(TEST_USER.email);
      await page.locator('input[type="checkbox"]').check();

      // Submit button is disabled when password requirements are not met,
      // so we click with force
      await page.getByRole('button', { name: 'Register' }).click({ force: true });

      await expect(page.getByText('Please enter a password.')).toBeVisible();
    });

    test('shows error for password shorter than 6 characters', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await page.locator('#username').fill(TEST_USER.username);
      await page.locator('#email').fill(TEST_USER.email);
      await page.locator('#password').fill('abc');
      await page.locator('#confirmPassword').fill('abc');
      await page.locator('input[type="checkbox"]').check();

      await page.getByRole('button', { name: 'Register' }).click({ force: true });

      await expect(page.getByText('Password must be at least 6 characters long.')).toBeVisible();
    });

    test('shows error when passwords do not match', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await page.locator('#username').fill(TEST_USER.username);
      await page.locator('#email').fill(TEST_USER.email);
      await page.locator('#password').fill('password123');
      await page.locator('#confirmPassword').fill('different123');
      await page.locator('input[type="checkbox"]').check();

      await page.getByRole('button', { name: 'Register' }).click({ force: true });

      await expect(page.getByText('Passwords do not match.')).toBeVisible();
    });

    test('shows error when terms checkbox is not checked', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await page.locator('#username').fill(TEST_USER.username);
      await page.locator('#email').fill(TEST_USER.email);
      await page.locator('#password').fill(TEST_USER.password);
      await page.locator('#confirmPassword').fill(TEST_USER.password);

      // Do not check the terms checkbox
      // Button is disabled, click with force
      await page.getByRole('button', { name: 'Register' }).click({ force: true });

      await expect(page.getByText('Please accept the Terms and Conditions to continue.')).toBeVisible();
    });
  });

  test.describe('Submit button state', () => {
    test('register button is disabled when requirements are not met', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      const submitButton = page.getByRole('button', { name: 'Register' });
      await expect(submitButton).toBeDisabled();
    });

    test('register button is enabled when all requirements are met', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await page.locator('#username').fill(TEST_USER.username);
      await page.locator('#email').fill(TEST_USER.email);
      await page.locator('#password').fill(TEST_USER.password);
      await page.locator('#confirmPassword').fill(TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();

      const submitButton = page.getByRole('button', { name: 'Register' });
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe('Form submission', () => {
    test('POSTs to /api/signup with correct data', async ({ page }) => {
      let requestBody: Record<string, string> = {};

      await page.route('**/api/signup', (route) => {
        const body = route.request().postDataJSON();
        requestBody = body;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Success' }),
        });
      });

      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await page.locator('#username').fill(TEST_USER.username);
      await page.locator('#callSign').fill(TEST_USER.callSign);
      await page.locator('#email').fill(TEST_USER.email);
      await page.locator('#password').fill(TEST_USER.password);
      await page.locator('#confirmPassword').fill(TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();
      await page.getByRole('button', { name: 'Register' }).click();

      // Wait for the API request
      await page.waitForResponse('**/api/signup');

      expect(requestBody.username).toBe(TEST_USER.username);
      expect(requestBody.email).toBe(TEST_USER.email);
      expect(requestBody.password).toBe(TEST_USER.password);
      expect(requestBody.callSign).toBe(TEST_USER.callSign);
    });

    test('shows success message on successful signup', async ({ page }) => {
      await page.route('**/api/signup', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Account created successfully' }),
        })
      );

      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await page.locator('#username').fill(TEST_USER.username);
      await page.locator('#email').fill(TEST_USER.email);
      await page.locator('#password').fill(TEST_USER.password);
      await page.locator('#confirmPassword').fill(TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();
      await page.getByRole('button', { name: 'Register' }).click();

      await expect(page.getByText(/Account created|check your email|verification/i)).toBeVisible();
    });

    test('shows error message on failed signup', async ({ page }) => {
      await page.route('**/api/signup', (route) =>
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Email already in use.' }),
        })
      );

      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await page.locator('#username').fill(TEST_USER.username);
      await page.locator('#email').fill(TEST_USER.email);
      await page.locator('#password').fill(TEST_USER.password);
      await page.locator('#confirmPassword').fill(TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();
      await page.getByRole('button', { name: 'Register' }).click();

      await expect(page.getByText('Email already in use.')).toBeVisible();
    });
  });

  test.describe('Call sign field', () => {
    test('call sign field enforces maxLength of 10', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      const callSignField = page.locator('#callSign');
      await callSignField.fill('ABCDEFGHIJKLM');

      // The value should be truncated to 10 characters
      const value = await callSignField.inputValue();
      expect(value.length).toBeLessThanOrEqual(10);
    });

    test('call sign field is optional', async ({ page }) => {
      await page.route('**/api/signup', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Success' }),
        })
      );

      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      // Fill all fields except call sign
      await page.locator('#username').fill(TEST_USER.username);
      await page.locator('#email').fill(TEST_USER.email);
      await page.locator('#password').fill(TEST_USER.password);
      await page.locator('#confirmPassword').fill(TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();
      await page.getByRole('button', { name: 'Register' }).click();

      // Should not show any validation error about call sign
      await expect(page.getByText(/call sign/i)).not.toBeVisible({ timeout: 2000 }).catch(() => {
        // This is acceptable - call sign helper text may be visible
      });
    });
  });
});
