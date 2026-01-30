import { test, expect } from '@playwright/test';

test.describe('Navigation Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('navbar is visible on the home page', async ({ page }) => {
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });

  test('navbar contains key navigation links', async ({ page }) => {
    // Check that important nav items exist
    const navLinks = page.locator('nav a, nav button');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('logo / brand link navigates to home', async ({ page }) => {
    // Click on the logo or brand name which should link to home
    const logo = page.locator('nav a[href="/"]').first();
    if (await logo.isVisible()) {
      await logo.click();
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test('login link is accessible from home page', async ({ page }) => {
    // Look for a login link/button in the navbar or on the page
    const loginLink = page.locator('a[href="/login"], a[href="/login-civ"], a[href="/login-select"]').first();
    await expect(loginLink).toBeVisible();
  });

  test('signup link is accessible from home page', async ({ page }) => {
    const signupLink = page.locator('a[href="/signup"], a[href="/signup-civ"], a[href="/signup-list"]').first();
    await expect(signupLink).toBeVisible();
  });

  test('footer is visible on the home page', async ({ page }) => {
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
  });

  test('footer contains copyright or brand text', async ({ page }) => {
    const footer = page.locator('footer');
    const footerText = await footer.textContent();
    expect(footerText?.toLowerCase()).toMatch(/lines|police|cad|copyright|©/);
  });

  test('page title contains LPC', async ({ page }) => {
    await expect(page).toHaveTitle(/LPC/);
  });
});
