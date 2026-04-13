import { test, expect } from '../../fixtures/test-fixtures';
import { LoginPage } from '../../pages/login.page';

test.describe('Login Page', () => {
  test('displays login form with all elements', async ({ unauthPage }) => {
    const loginPage = new LoginPage(unauthPage);
    await loginPage.goto();
    await loginPage.expectLoaded();
    await expect(loginPage.forgotPasswordLink).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();
  });

  test('email field is required', async ({ unauthPage }) => {
    const loginPage = new LoginPage(unauthPage);
    await loginPage.goto();
    await expect(loginPage.emailInput).toHaveAttribute('required', '');
  });

  test('password field is required', async ({ unauthPage }) => {
    const loginPage = new LoginPage(unauthPage);
    await loginPage.goto();
    await expect(loginPage.passwordInput).toHaveAttribute('required', '');
  });

  test('shows error for invalid credentials', async ({ unauthPage }) => {
    const loginPage = new LoginPage(unauthPage);
    await loginPage.goto();
    // Wait for Next.js hydration — the form is interactive once the button is enabled
    await expect(loginPage.submitButton).toBeEnabled();
    await loginPage.emailInput.click();
    await loginPage.emailInput.fill('invalid@example.com');
    await loginPage.passwordInput.click();
    await loginPage.passwordInput.fill('wrongpassword');
    await loginPage.submitButton.click();

    // The login form does a full-page POST /login via hidden form.
    // Passport authenticates against the external API, then redirects back
    // to /login?error=... on failure. Rate limiting may show "Too many requests".
    await unauthPage.waitForLoadState('networkidle', { timeout: 30_000 });
    await expect(
      unauthPage.getByText(/Invalid email or password|Too many requests|error/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('forgot password link navigates correctly', async ({ unauthPage }) => {
    const loginPage = new LoginPage(unauthPage);
    await loginPage.goto();
    await loginPage.forgotPasswordLink.click();
    await expect(unauthPage).toHaveURL(/\/forgot-password/);
  });

  test('register link navigates correctly', async ({ unauthPage }) => {
    const loginPage = new LoginPage(unauthPage);
    await loginPage.goto();
    await loginPage.registerLink.click();
    await expect(unauthPage).toHaveURL(/\/signup/);
  });
});
