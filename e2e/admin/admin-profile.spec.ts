import { test, expect } from '../fixtures/test-fixtures';

test.describe('Admin Profile', () => {
  test.describe('Page Load', () => {
    test('loads without server errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      const response = await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      expect(response?.status()).toBeLessThan(500);
    });

    test('has the correct page title', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      await expect(page).toHaveTitle(/Admin Profile/);
    });

    test('renders the body with content', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  });

  test.describe('Admin Navbar', () => {
    test('displays the admin navigation bar', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const navbar = page.locator('.admin-navbar');
      await expect(navbar).toBeVisible();
    });

    test('navbar has LPC Admin Console brand', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const brand = page.locator('.navbar-brand');
      await expect(brand).toBeAttached();
      await expect(brand).toContainText('LPC Admin Console');
    });

    test('navbar brand links to admin console', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const brand = page.locator('.navbar-brand');
      await expect(brand).toHaveAttribute('href', '/admin/console');
    });

    test('navbar displays admin name or email', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const adminInfo = page.locator('.admin-navbar .navbar-nav span').first();
      await expect(adminInfo).toBeAttached();
    });

    test('has a logout button', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const logoutBtn = page.locator('.admin-navbar').getByText('Logout');
      await expect(logoutBtn).toBeAttached();
    });

    test('logout form has correct action', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const logoutForm = page.locator('#logoutForm');
      await expect(logoutForm).toBeAttached();
      await expect(logoutForm).toHaveAttribute('action', '/admin/logout');
      await expect(logoutForm).toHaveAttribute('method', 'POST');
    });
  });

  test.describe('Back Navigation', () => {
    test('has a Back to Console link', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const backLink = page.locator('a.back-link');
      await expect(backLink).toBeVisible();
      await expect(backLink).toContainText('Back to Console');
    });

    test('back link points to admin console', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const backLink = page.locator('a.back-link');
      await expect(backLink).toHaveAttribute('href', '/admin/console');
    });
  });

  test.describe('Profile Card', () => {
    test('displays the profile card', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const profileCard = page.locator('.profile-card');
      await expect(profileCard).toBeVisible();
    });

    test('displays Admin Profile heading', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const heading = page.getByText('Admin Profile');
      await expect(heading).toBeVisible();
    });

    test('has admin container section', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const adminContainer = page.locator('.admin-container');
      await expect(adminContainer).toBeAttached();
    });
  });

  test.describe('Profile Form', () => {
    test('has a profile form', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const form = page.locator('#profileForm');
      await expect(form).toBeAttached();
    });

    test('has a profile picture section', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const profilePic = page.locator('#profilePicturePreview');
      await expect(profilePic).toBeAttached();
    });

    test('has a profile picture upload input', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const uploadInput = page.locator('#profilePictureInput');
      await expect(uploadInput).toBeAttached();
      await expect(uploadInput).toHaveAttribute('type', 'file');
      await expect(uploadInput).toHaveAttribute('accept', 'image/*');
    });

    test('has a First Name input', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const firstName = page.locator('#firstName');
      await expect(firstName).toBeAttached();
      await expect(firstName).toHaveAttribute('name', 'firstName');
      await expect(firstName).toHaveAttribute('required', '');
    });

    test('First Name label is present', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const label = page.locator('label[for="firstName"]');
      await expect(label).toBeAttached();
      await expect(label).toContainText('First Name');
    });

    test('has a Last Name input', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const lastName = page.locator('#lastName');
      await expect(lastName).toBeAttached();
      await expect(lastName).toHaveAttribute('name', 'lastName');
      await expect(lastName).toHaveAttribute('required', '');
    });

    test('Last Name label is present', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const label = page.locator('label[for="lastName"]');
      await expect(label).toBeAttached();
      await expect(label).toContainText('Last Name');
    });

    test('has an Email input', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const email = page.locator('#email');
      await expect(email).toBeAttached();
      await expect(email).toHaveAttribute('name', 'email');
      await expect(email).toHaveAttribute('type', 'email');
    });

    test('Email label is present', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const label = page.locator('label[for="email"]');
      await expect(label).toBeAttached();
      await expect(label).toContainText('Email');
    });

    test('has a hidden profile picture value field', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const hiddenField = page.locator('#profilePicture');
      await expect(hiddenField).toBeAttached();
      await expect(hiddenField).toHaveAttribute('type', 'hidden');
    });

    test('has a Save Profile button', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const saveBtn = page.locator('#profileForm button[type="submit"]');
      await expect(saveBtn).toBeAttached();
      await expect(saveBtn).toContainText('Save Profile');
    });
  });

  test.describe('Password Section', () => {
    test('displays password is encrypted message', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const passwordMsg = page.getByText('Password is encrypted');
      await expect(passwordMsg).toBeAttached();
    });

    test('has a Reset Password link', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const resetLink = page.locator('a[href="/admin/forgot-password"]');
      await expect(resetLink).toBeAttached();
      await expect(resetLink).toContainText('Reset Password');
    });
  });

  test.describe('Alert Container', () => {
    test('has an alert container for messages', async ({ page }) => {
      await page.goto('/admin/profile', { waitUntil: 'domcontentloaded' });

      const alertContainer = page.locator('#alertContainer');
      await expect(alertContainer).toBeAttached();
    });
  });
});
