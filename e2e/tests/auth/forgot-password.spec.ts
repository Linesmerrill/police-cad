import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Forgot Password Page', () => {
  test('displays forgot password form', async ({ unauthPage }) => {
    await unauthPage.goto('/forgot-password');
    await expect(unauthPage.locator('h1')).toBeVisible();
    await expect(unauthPage.locator('#email')).toBeVisible();
    await expect(unauthPage.locator('button[type="submit"]')).toBeVisible();
  });

  test('email field is required', async ({ unauthPage }) => {
    await unauthPage.goto('/forgot-password');
    // The email input has HTML5 required attribute
    const emailInput = unauthPage.locator('#email');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('email input has email type validation', async ({ unauthPage }) => {
    await unauthPage.goto('/forgot-password');
    const emailInput = unauthPage.locator('#email');
    // The input is type="email" so the browser validates format natively
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('has link back to login', async ({ unauthPage }) => {
    await unauthPage.goto('/forgot-password');
    const loginLink = unauthPage.locator('a[href="/login"]').last();
    await expect(loginLink).toBeVisible();
  });
});
