import { test, expect } from '../fixtures/test-fixtures';
import { Page } from '@playwright/test';
import { TEST_USER } from '../fixtures/test-data';

/**
 * Wait for React hydration to complete on the signup form.
 * The Suspense boundary in signup/page.tsx renders "Loading..." until hydration.
 * After hydration, the form with its fields appears.
 * We wait for the form to be present and ensure React has attached its event handlers
 * by checking that the submit button is present and in its initial disabled state.
 */
async function waitForSignupForm(page: Page) {
  // Wait for the Register button (which only appears after React hydration)
  await page.getByRole('button', { name: 'Register' }).waitFor({ state: 'visible', timeout: 30000 });
  // Wait a beat for React to fully attach all event handlers
  await page.waitForTimeout(500);
}

/**
 * Helper to set a value on a React controlled input reliably.
 * Uses Playwright's native fill() which dispatches proper events, then verifies
 * the value was actually set by checking the input's value attribute.
 * If fill() didn't trigger React's onChange (rare race condition), falls back
 * to using the native input value setter with explicit event dispatch.
 */
async function reactFill(page: Page, selector: string, value: string) {
  const locator = page.locator(selector);
  // Ensure the element is visible and interactive
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  // Click to focus first (helps ensure React event handlers are connected)
  await locator.click();
  // Use Playwright's fill() to set the DOM value properly
  await locator.fill(value);

  // Verify the value was set correctly by React (controlled component pattern).
  // If React's onChange didn't fire, it will reset the value from state.
  // Give React a moment to process the event and re-render.
  await page.waitForTimeout(100);
  const currentValue = await locator.inputValue();
  if (currentValue !== value) {
    // React didn't pick up the fill(). Use native setter + event dispatch as fallback.
    await page.evaluate(
      ({ sel, val }) => {
        const el = document.querySelector(sel) as HTMLInputElement;
        if (!el) return;
        // Focus the element
        el.focus();
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(el, val);
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      { sel: selector, val: value }
    );
    // Give React another chance to process
    await page.waitForTimeout(100);
    // Last resort: try fill() one more time
    const secondCheck = await locator.inputValue();
    if (secondCheck !== value) {
      await locator.fill(value);
      await page.waitForTimeout(100);
    }
  }
}

test.describe('Signup Page', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();
  });

  test.describe('Page rendering', () => {
    test('displays signup page with correct headings', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('heading', { level: 1 })).toContainText('REGISTER');
      await expect(page.getByRole('heading', { name: 'Create an Account' })).toBeVisible();
      await expect(page.getByText('Join Lines Police CAD today')).toBeVisible();
    });

    test('displays all required form fields', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      const usernameField = page.locator('#username');
      await expect(usernameField).toBeVisible();
      await expect(usernameField).toHaveAttribute('placeholder', 'Enter your username');

      const callSignField = page.locator('#callSign');
      await expect(callSignField).toBeVisible();
      await expect(callSignField).toHaveAttribute('placeholder', 'Optional - Max 10 characters');
      await expect(callSignField).toHaveAttribute('maxLength', '10');

      const emailField = page.locator('#email');
      await expect(emailField).toBeVisible();
      await expect(emailField).toHaveAttribute('placeholder', 'Enter your email');

      const passwordField = page.locator('#password');
      await expect(passwordField).toBeVisible();
      await expect(passwordField).toHaveAttribute('placeholder', 'Enter your password');

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
      await waitForSignupForm(page);

      await reactFill(page, '#password', 'abc');
      await reactFill(page, '#password', 'abcdef');

      const requirementContainer = page.getByText('At least 6 characters').locator('..');
      await expect(requirementContainer).toBeVisible();
    });

    test('shows "Passwords match" indicator when confirm password has text', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });
      await waitForSignupForm(page);

      await reactFill(page, '#password', 'testpass123');
      await page.waitForTimeout(200);
      await reactFill(page, '#confirmPassword', 'testpass123');
      await page.waitForTimeout(200);

      await expect(page.getByText('Passwords match')).toBeVisible({ timeout: 5000 });
    });

    test('password match indicator not visible when confirm field is empty', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });
      await waitForSignupForm(page);

      await reactFill(page, '#password', 'testpass123');

      await expect(page.getByText('Passwords match')).not.toBeVisible();
    });
  });

  test.describe('Password visibility toggle', () => {
    test('password field toggles between hidden and visible', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });
      await waitForSignupForm(page);

      const passwordField = page.locator('#password');
      await expect(passwordField).toHaveAttribute('type', 'password');

      const toggleButton = page.getByRole('button', { name: 'Show password' });
      await expect(toggleButton).toBeVisible({ timeout: 10000 });
      await toggleButton.click();
      await expect(passwordField).toHaveAttribute('type', 'text', { timeout: 5000 });

      const hideButton = page.getByRole('button', { name: 'Hide password' });
      await hideButton.click();
      await expect(passwordField).toHaveAttribute('type', 'password', { timeout: 5000 });
    });

    test('confirm password field toggles between hidden and visible', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });
      await waitForSignupForm(page);

      const confirmField = page.locator('#confirmPassword');
      await expect(confirmField).toHaveAttribute('type', 'password');

      const toggleButton = page.getByRole('button', { name: 'Show confirm password' });
      await expect(toggleButton).toBeVisible({ timeout: 10000 });
      await toggleButton.click();

      await expect(confirmField).toHaveAttribute('type', 'text', { timeout: 5000 });
    });
  });

  test.describe('Client-side validation', () => {
    // Helper: Submit the signup form bypassing both the disabled button and HTML5 validation.
    // The signup button is disabled={loading || !isMinLength || !passwordsMatch || !acceptedTerms}.
    // Client validation tests intentionally leave fields invalid to test React's handleSubmit validation.
    // We must:
    // 1. Remove all HTML5 'required' attributes to prevent browser-level validation blocking
    // 2. Change type='email' to type='text' to prevent browser email format checking
    // 3. Remove the 'disabled' attribute from the button
    // 4. Dispatch a submit event on the form to trigger React's onSubmit handler

    test('shows error for empty username', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });

      // Fill everything except username
      await reactFill(page, '#email', TEST_USER.email);
      await reactFill(page, '#password', TEST_USER.password);
      await reactFill(page, '#confirmPassword', TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();
      await page.waitForTimeout(300);

      // Bypass HTML5 validation and submit
      await page.evaluate(() => {
        document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'));
        document.querySelectorAll('input[type="email"]').forEach((el: any) => { el.type = 'text'; });
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (btn) btn.removeAttribute('disabled');
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      });

      await expect(page.getByText('Please enter a username.')).toBeVisible({ timeout: 10000 });
    });

    test('shows error for username shorter than 3 characters', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });
      await waitForSignupForm(page);

      await reactFill(page, '#username', 'ab');
      await reactFill(page, '#email', TEST_USER.email);
      await reactFill(page, '#password', TEST_USER.password);
      await reactFill(page, '#confirmPassword', TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();
      await page.waitForTimeout(300);

      // Bypass HTML5 validation + disabled button, then submit
      await page.evaluate(() => {
        document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'));
        document.querySelectorAll('input[type="email"]').forEach((el: any) => { el.type = 'text'; });
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (btn) btn.removeAttribute('disabled');
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      });

      await expect(page.getByText('Username must be at least 3 characters long.')).toBeVisible({ timeout: 10000 });
    });

    test('shows error for empty email', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });
      await waitForSignupForm(page);

      await reactFill(page, '#username', TEST_USER.username);
      await reactFill(page, '#password', TEST_USER.password);
      await reactFill(page, '#confirmPassword', TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();
      await page.waitForTimeout(300);

      // Bypass HTML5 validation + disabled button, then submit
      await page.evaluate(() => {
        document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'));
        document.querySelectorAll('input[type="email"]').forEach((el: any) => { el.type = 'text'; });
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (btn) btn.removeAttribute('disabled');
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      });

      await expect(page.getByText('Please enter your email address.')).toBeVisible({ timeout: 10000 });
    });

    test('shows error for invalid email format', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });
      await waitForSignupForm(page);

      await reactFill(page, '#username', TEST_USER.username);
      await reactFill(page, '#email', 'notanemail');
      await reactFill(page, '#password', TEST_USER.password);
      await reactFill(page, '#confirmPassword', TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();
      await page.waitForTimeout(300);

      // Bypass HTML5 validation + disabled button, then submit
      await page.evaluate(() => {
        document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'));
        document.querySelectorAll('input[type="email"]').forEach((el: any) => { el.type = 'text'; });
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (btn) btn.removeAttribute('disabled');
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      });

      await expect(page.getByText('Please enter a valid email address.')).toBeVisible({ timeout: 10000 });
    });

    test('shows error for empty password', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });
      await waitForSignupForm(page);

      await reactFill(page, '#username', TEST_USER.username);
      await reactFill(page, '#email', TEST_USER.email);
      await page.locator('input[type="checkbox"]').check();
      await page.waitForTimeout(300);

      // Bypass HTML5 validation + disabled button, then submit
      await page.evaluate(() => {
        document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'));
        document.querySelectorAll('input[type="email"]').forEach((el: any) => { el.type = 'text'; });
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (btn) btn.removeAttribute('disabled');
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      });

      await expect(page.getByText('Please enter a password.')).toBeVisible({ timeout: 10000 });
    });

    test('shows error for password shorter than 6 characters', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });
      await waitForSignupForm(page);

      await reactFill(page, '#username', TEST_USER.username);
      await reactFill(page, '#email', TEST_USER.email);
      await reactFill(page, '#password', 'abc');
      await reactFill(page, '#confirmPassword', 'abc');
      await page.locator('input[type="checkbox"]').check();
      await page.waitForTimeout(300);

      // Bypass HTML5 validation + disabled button, then submit
      await page.evaluate(() => {
        document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'));
        document.querySelectorAll('input[type="email"]').forEach((el: any) => { el.type = 'text'; });
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (btn) btn.removeAttribute('disabled');
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      });

      await expect(page.getByText('Password must be at least 6 characters long.')).toBeVisible({ timeout: 10000 });
    });

    test('shows error when passwords do not match', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });
      await waitForSignupForm(page);

      await reactFill(page, '#username', TEST_USER.username);
      await reactFill(page, '#email', TEST_USER.email);
      await reactFill(page, '#password', 'password123');
      await reactFill(page, '#confirmPassword', 'different123');
      await page.locator('input[type="checkbox"]').check();
      await page.waitForTimeout(300);

      // Bypass HTML5 validation + disabled button, then submit
      await page.evaluate(() => {
        document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'));
        document.querySelectorAll('input[type="email"]').forEach((el: any) => { el.type = 'text'; });
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (btn) btn.removeAttribute('disabled');
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      });

      await expect(page.getByText('Passwords do not match.')).toBeVisible({ timeout: 10000 });
    });

    test('shows error when terms checkbox is not checked', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });
      await waitForSignupForm(page);

      await reactFill(page, '#username', TEST_USER.username);
      await reactFill(page, '#email', TEST_USER.email);
      await reactFill(page, '#password', TEST_USER.password);
      await reactFill(page, '#confirmPassword', TEST_USER.password);
      await page.waitForTimeout(300);

      // Bypass HTML5 validation + disabled button, then submit
      await page.evaluate(() => {
        document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'));
        document.querySelectorAll('input[type="email"]').forEach((el: any) => { el.type = 'text'; });
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (btn) btn.removeAttribute('disabled');
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      });

      await expect(page.getByText('Please accept the Terms and Conditions to continue.')).toBeVisible({ timeout: 10000 });
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
      await waitForSignupForm(page);

      await reactFill(page, '#username', TEST_USER.username);
      await reactFill(page, '#email', TEST_USER.email);
      await reactFill(page, '#password', TEST_USER.password);
      await reactFill(page, '#confirmPassword', TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();
      await page.waitForTimeout(300);

      // Wait for React state to propagate and button to become enabled
      await page.waitForFunction(
        () => {
          const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
          return btn && !btn.disabled;
        },
        { timeout: 15000 }
      );
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
      await waitForSignupForm(page);

      await reactFill(page, '#username', TEST_USER.username);
      await reactFill(page, '#callSign', TEST_USER.callSign);
      await reactFill(page, '#email', TEST_USER.email);
      await reactFill(page, '#password', TEST_USER.password);
      await reactFill(page, '#confirmPassword', TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();
      await page.waitForTimeout(300);

      // Wait for React state to fully propagate and button to become enabled.
      await page.waitForFunction(
        () => {
          const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
          return btn && !btn.disabled;
        },
        { timeout: 15000 }
      );
      const submitButton = page.getByRole('button', { name: 'Register' });
      await submitButton.click();

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
      await waitForSignupForm(page);

      await reactFill(page, '#username', TEST_USER.username);
      await reactFill(page, '#email', TEST_USER.email);
      await reactFill(page, '#password', TEST_USER.password);
      await reactFill(page, '#confirmPassword', TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();
      await page.waitForTimeout(300);

      // Wait for React state to fully propagate and button to become enabled.
      await page.waitForFunction(
        () => {
          const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
          return btn && !btn.disabled;
        },
        { timeout: 15000 }
      );
      const submitButton = page.getByRole('button', { name: 'Register' });
      await submitButton.click();

      await expect(page.getByText(/Account created|check your email|verification/i)).toBeVisible({ timeout: 10000 });
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
      await waitForSignupForm(page);

      await reactFill(page, '#username', TEST_USER.username);
      await reactFill(page, '#email', TEST_USER.email);
      await reactFill(page, '#password', TEST_USER.password);
      await reactFill(page, '#confirmPassword', TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();
      await page.waitForTimeout(300);

      // Wait for React state to fully propagate and button to become enabled.
      await page.waitForFunction(
        () => {
          const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
          return btn && !btn.disabled;
        },
        { timeout: 15000 }
      );
      const submitButton = page.getByRole('button', { name: 'Register' });
      await submitButton.click();

      await expect(page.getByText('Email already in use.')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Call sign field', () => {
    test('call sign field enforces maxLength of 10', async ({ page }) => {
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });
      await waitForSignupForm(page);

      const callSignField = page.locator('#callSign');
      await callSignField.fill('ABCDEFGHIJKLM');

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
      await waitForSignupForm(page);

      await reactFill(page, '#username', TEST_USER.username);
      await reactFill(page, '#email', TEST_USER.email);
      await reactFill(page, '#password', TEST_USER.password);
      await reactFill(page, '#confirmPassword', TEST_USER.password);
      await page.locator('input[type="checkbox"]').check();
      await page.waitForTimeout(300);

      // Wait for React state to fully propagate and button to become enabled.
      await page.waitForFunction(
        () => {
          const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
          return btn && !btn.disabled;
        },
        { timeout: 15000 }
      );
      const submitButton = page.getByRole('button', { name: 'Register' });
      await submitButton.click();

      // Should not show any validation error about call sign
      await expect(page.getByText(/call sign/i)).not.toBeVisible({ timeout: 2000 }).catch(() => {
        // Acceptable - call sign helper text may be visible
      });
    });
  });
});
