import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Signup Page', () => {
  test('displays signup form with all fields', async ({ unauthPage }) => {
    await unauthPage.goto('/signup');
    await expect(unauthPage.locator('h1')).toBeVisible();
    await expect(unauthPage.locator('#username')).toBeVisible();
    await expect(unauthPage.locator('#email')).toBeVisible();
    await expect(unauthPage.locator('#password')).toBeVisible();
    await expect(unauthPage.locator('#confirmPassword')).toBeVisible();
  });

  test('shows password length requirement', async ({ unauthPage }) => {
    await unauthPage.goto('/signup');
    await expect(unauthPage.getByText('At least 6 characters')).toBeVisible();
  });

  test('shows passwords match indicator', async ({ unauthPage }) => {
    await unauthPage.goto('/signup');
    await unauthPage.locator('#password').fill('TestPass123');
    await unauthPage.locator('#confirmPassword').fill('TestPass123');
    await expect(unauthPage.getByText('Passwords match')).toBeVisible();
  });

  test('has terms checkbox', async ({ unauthPage }) => {
    await unauthPage.goto('/signup');
    const checkbox = unauthPage.locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible();
  });

  test('login link navigates to login page', async ({ unauthPage }) => {
    await unauthPage.goto('/signup');
    const loginLink = unauthPage.locator('a[href="/login"]').last();
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(unauthPage).toHaveURL(/\/login/);
  });
});
