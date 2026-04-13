import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Signup Page', () => {
  test('loads successfully', async ({ unauthPage }) => {
    const response = await unauthPage.goto('/signup', { waitUntil: 'domcontentloaded' });
    expect(response?.ok() || response?.status() === 304).toBeTruthy();
    // Check for signup-specific text content (works with SSR before hydration)
    await expect(unauthPage.getByText(/create.*account|sign.*up|register/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('shows password length requirement', async ({ unauthPage }) => {
    await unauthPage.goto('/signup', { waitUntil: 'domcontentloaded' });
    await expect(unauthPage.getByText('6 characters')).toBeVisible({ timeout: 15_000 });
  });

  test('has terms checkbox', async ({ unauthPage }) => {
    await unauthPage.goto('/signup', { waitUntil: 'domcontentloaded' });
    const checkbox = unauthPage.locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible({ timeout: 15_000 });
  });

  test('login link navigates to login page', async ({ unauthPage }) => {
    await unauthPage.goto('/signup', { waitUntil: 'domcontentloaded' });
    const loginLink = unauthPage.locator('a[href="/login"]').last();
    await expect(loginLink).toBeVisible({ timeout: 15_000 });
    await loginLink.click();
    await expect(unauthPage).toHaveURL(/\/login/);
  });
});
