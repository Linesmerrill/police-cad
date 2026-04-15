import { test, expect } from '@playwright/test';

test.describe('Profile Page', { tag: '@auth' }, () => {
  test('loads profile page and displays user info', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).not.toHaveURL(/\/login/);

    // Wait for loading to finish — the page fetches /api/user/current
    // and renders "Account Overview" heading when data loads
    await expect(page.getByText('Account Overview')).toBeVisible({ timeout: 15_000 });
  });

  test('displays username in account overview', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('Account Overview')).toBeVisible({ timeout: 15_000 });

    // Test user's username should appear
    await expect(page.getByText('testuser')).toBeVisible({ timeout: 5_000 });
  });

  test('displays call sign in account overview', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('Account Overview')).toBeVisible({ timeout: 15_000 });

    // Test user's call sign T-1 should appear
    await expect(page.getByText('T-1')).toBeVisible({ timeout: 5_000 });
  });

  test('shows account settings section with edit buttons', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('Account Overview')).toBeVisible({ timeout: 15_000 });

    // Account settings section should have edit buttons
    await expect(page.getByText('Account Settings')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /Update Username/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Update Call Sign/i })).toBeVisible();
  });

  test('shows change password and change email buttons', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('Account Overview')).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole('button', { name: /Change Password/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Change Email/i })).toBeVisible();
  });

  test('shows danger zone with deactivate button', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('Account Overview')).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText('Danger Zone')).toBeVisible();
    await expect(page.getByRole('button', { name: /Deactivate Account/i })).toBeVisible();
  });

  test('username edit mode toggles correctly', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('Account Overview')).toBeVisible({ timeout: 15_000 });

    // Click "Update Username" to enter edit mode
    await page.getByRole('button', { name: /Update Username/i }).click();

    // Should show Save and Cancel buttons
    await expect(page.getByRole('button', { name: /Save/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Cancel/i }).first()).toBeVisible();

    // Click Cancel to exit edit mode
    await page.getByRole('button', { name: /Cancel/i }).first().click();

    // Update Username button should be visible again
    await expect(page.getByRole('button', { name: /Update Username/i })).toBeVisible();
  });

  test('has navbar and footer', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).not.toHaveURL(/\/login/);

    await expect(page.locator('nav').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('footer').first()).toBeVisible({ timeout: 10_000 });
  });
});
