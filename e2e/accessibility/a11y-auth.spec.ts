import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility - Auth Pages', () => {
  test.setTimeout(60000);

  test('login page form is accessible', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'commit' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page })
      .include('form')
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });

  test('login page has proper labels for form inputs', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'commit' });
    await page.waitForLoadState('networkidle');

    // Email field should have an associated label
    const emailInput = page.locator('#email');
    const emailLabel = page.locator('label[for="email"]');
    await expect(emailInput).toBeVisible();
    await expect(emailLabel).toBeVisible();

    // Password field should have an associated label
    const passwordInput = page.locator('#password');
    const passwordLabel = page.locator('label[for="password"]');
    await expect(passwordInput).toBeVisible();
    await expect(passwordLabel).toBeVisible();
  });

  test('signup page form is accessible', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'commit' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page })
      .include('form')
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });

  test('signup page has proper labels for all form inputs', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'commit' });
    await page.waitForLoadState('networkidle');

    const fields = ['username', 'callSign', 'email', 'password', 'confirmPassword'];
    for (const fieldId of fields) {
      const input = page.locator(`#${fieldId}`);
      const label = page.locator(`label[for="${fieldId}"]`);
      await expect(input).toBeVisible();
      await expect(label).toBeVisible();
    }
  });
});
