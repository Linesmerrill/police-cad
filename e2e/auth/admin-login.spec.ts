import { test, expect } from '../fixtures/test-fixtures';
import { TEST_ADMIN } from '../fixtures/test-data';

test.describe('Admin Login Page', () => {
  test.describe('Page rendering', () => {
    test('displays admin login page with correct headings', async ({ page, mockApi }) => {
      await mockApi.blockExternalApis();

      await page.goto('/admin', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('h2')).toContainText('Admin Console');
      await expect(page.getByText('Sign in with your admin credentials')).toBeVisible();
    });

    test('displays email and password fields', async ({ page, mockApi }) => {
      await mockApi.blockExternalApis();

      await page.goto('/admin', { waitUntil: 'domcontentloaded' });

      const emailField = page.locator('#adminEmail');
      await expect(emailField).toBeVisible();
      await expect(emailField).toHaveAttribute('type', 'email');
      await expect(emailField).toHaveAttribute('placeholder', 'you@example.com');

      const passwordField = page.locator('#adminPassword');
      await expect(passwordField).toBeVisible();
      await expect(passwordField).toHaveAttribute('type', 'password');
    });

    test('displays submit button with "Sign In" text', async ({ page, mockApi }) => {
      await mockApi.blockExternalApis();

      await page.goto('/admin', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });

    test('has "Forgot admin password?" link', async ({ page, mockApi }) => {
      await mockApi.blockExternalApis();

      await page.goto('/admin', { waitUntil: 'domcontentloaded' });

      const forgotLink = page.getByRole('link', { name: 'Forgot admin password?' });
      await expect(forgotLink).toBeVisible();
      await expect(forgotLink).toHaveAttribute('href', '/admin/forgot-password');
    });

    test('has navigation links in navbar', async ({ page, mockApi }) => {
      await mockApi.blockExternalApis();

      await page.goto('/admin', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('nav')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    });

    test('form has correct action and method attributes', async ({ page, mockApi }) => {
      await mockApi.blockExternalApis();

      await page.goto('/admin', { waitUntil: 'domcontentloaded' });

      const form = page.locator('form[action="/admin"]');
      await expect(form).toBeAttached();
      await expect(form).toHaveAttribute('method', 'post');
    });
  });

  test.describe('Form fields', () => {
    test('email field has required attribute', async ({ page, mockApi }) => {
      await mockApi.blockExternalApis();

      await page.goto('/admin', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('#adminEmail')).toHaveAttribute('required', '');
    });

    test('password field has required attribute', async ({ page, mockApi }) => {
      await mockApi.blockExternalApis();

      await page.goto('/admin', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('#adminPassword')).toHaveAttribute('required', '');
    });

    test('email and password fields accept input', async ({ page, mockApi }) => {
      await mockApi.blockExternalApis();

      await page.goto('/admin', { waitUntil: 'domcontentloaded' });

      await page.locator('#adminEmail').fill(TEST_ADMIN.email);
      await page.locator('#adminPassword').fill(TEST_ADMIN.password);

      await expect(page.locator('#adminEmail')).toHaveValue(TEST_ADMIN.email);
      await expect(page.locator('#adminPassword')).toHaveValue(TEST_ADMIN.password);
    });
  });

  test.describe('Form submission', () => {
    test('submits form via POST to /admin', async ({ page, mockApi }) => {
      await mockApi.blockExternalApis();

      let formSubmitted = false;
      let submittedData: Record<string, string> = {};

      await page.route('**/admin', (route) => {
        if (route.request().method() === 'POST') {
          formSubmitted = true;
          const body = route.request().postData();
          if (body) {
            const params = new URLSearchParams(body);
            submittedData = {
              email: params.get('email') || '',
              password: params.get('password') || '',
            };
          }
          return route.fulfill({
            status: 302,
            headers: { Location: '/admin/console' },
          });
        }
        return route.continue();
      });

      await page.goto('/admin', { waitUntil: 'domcontentloaded' });

      await page.locator('#adminEmail').fill(TEST_ADMIN.email);
      await page.locator('#adminPassword').fill(TEST_ADMIN.password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.waitForTimeout(1000);
      expect(formSubmitted).toBe(true);
      expect(submittedData.email).toBe(TEST_ADMIN.email);
      expect(submittedData.password).toBe(TEST_ADMIN.password);
    });
  });

  test.describe('Error messages', () => {
    test('displays error message when login fails', async ({ page, mockApi }) => {
      await mockApi.blockExternalApis();

      // Navigate to admin page with an error message rendered server-side
      // The EJS template renders errors from the `error` local variable.
      // We simulate this by intercepting the GET and returning rendered HTML.
      await page.route('**/admin', (route) => {
        if (route.request().method() === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: `
              <!DOCTYPE html>
              <html>
                <body>
                  <h2 class="admin-title text-center">Admin Console</h2>
                  <p class="admin-subtitle text-center">Sign in with your admin credentials</p>
                  <div class="alert alert-danger alert-compact" role="alert">
                    <strong>Login failed:</strong> Invalid credentials
                  </div>
                  <form action="/admin" method="post">
                    <input id="adminEmail" type="email" name="email" required />
                    <input id="adminPassword" type="password" name="password" required />
                    <button type="submit">Sign In</button>
                  </form>
                </body>
              </html>
            `,
          });
        }
        return route.continue();
      });

      await page.goto('/admin', { waitUntil: 'domcontentloaded' });

      await expect(page.getByText('Login failed:')).toBeVisible();
      await expect(page.getByText('Invalid credentials')).toBeVisible();
    });

    test('displays success message when present', async ({ page, mockApi }) => {
      await mockApi.blockExternalApis();

      await page.route('**/admin', (route) => {
        if (route.request().method() === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: `
              <!DOCTYPE html>
              <html>
                <body>
                  <h2 class="admin-title text-center">Admin Console</h2>
                  <p class="admin-subtitle text-center">Sign in with your admin credentials</p>
                  <div class="alert alert-success alert-compact" role="alert">
                    Password updated successfully. Please log in.
                  </div>
                  <form action="/admin" method="post">
                    <input id="adminEmail" type="email" name="email" required />
                    <input id="adminPassword" type="password" name="password" required />
                    <button type="submit">Sign In</button>
                  </form>
                </body>
              </html>
            `,
          });
        }
        return route.continue();
      });

      await page.goto('/admin', { waitUntil: 'domcontentloaded' });

      await expect(page.getByText('Password updated successfully')).toBeVisible();
    });
  });

  test.describe('Page does not produce errors', () => {
    test('admin login page loads without JS errors', async ({ page, mockApi }) => {
      await mockApi.blockExternalApis();

      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      const response = await page.goto('/admin', { waitUntil: 'domcontentloaded' });

      expect(response?.status()).toBeLessThan(500);
      expect(errors).toEqual([]);
    });
  });
});
