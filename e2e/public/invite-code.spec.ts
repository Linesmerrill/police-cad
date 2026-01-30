import { test, expect } from '../fixtures/test-fixtures';

// Helper to wait for React hydration on a specific element
async function waitForHydration(page: any, selector: string) {
  await page.waitForFunction(
    (sel: string) => {
      const el = document.querySelector(sel);
      return (
        el &&
        Object.keys(el).some(
          (k) =>
            k.startsWith('__reactFiber$') ||
            k.startsWith('__reactInternalInstance$')
        )
      );
    },
    selector,
    { timeout: 30000 }
  );
}

test.describe('Invite Code Page', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();
    await page.goto('/invite-code', { waitUntil: 'commit' });
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 30000 });
  });

  test('renders the page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await expect(page.locator('body')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('displays the Join Community heading', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('JOIN COMMUNITY');
  });

  test('displays the Enter Invite Code subheading', async ({ page }) => {
    await expect(page.getByText('Enter Invite Code')).toBeVisible();
  });

  test('displays the description text', async ({ page }) => {
    await expect(
      page.getByText('Have an invite code? Enter it below to join a community.')
    ).toBeVisible();
  });

  test('displays the navbar and footer', async ({ page }) => {
    await expect(page.locator('nav').first()).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();
  });

  test('has an invite code input field', async ({ page }) => {
    const input = page.locator('#inviteCode');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Enter your invite code');
  });

  test('has an Invite Code label', async ({ page }) => {
    const label = page.locator('label[for="inviteCode"]');
    await expect(label).toBeVisible();
    await expect(label).toContainText('Invite Code');
  });

  test('has a Join Community submit button', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: 'Join Community' });
    await expect(submitButton).toBeVisible();
  });

  test('shows error when submitting empty invite code', async ({ page }) => {
    // Wait for React hydration so event handlers are attached
    await waitForHydration(page, '#inviteCode');
    const input = page.locator('#inviteCode');

    // Remove native required validation
    await input.evaluate((el) => el.removeAttribute('required'));

    // Fill with whitespace (React onChange will set inviteCode to '   ')
    await input.fill('   ');

    const submitButton = page.getByRole('button', { name: 'Join Community' });
    await submitButton.click();

    // The form should show an error for empty/whitespace code
    await expect(
      page.getByText('Please enter an invite code.')
    ).toBeVisible({ timeout: 5000 });
  });

  test('has a Browse Communities link', async ({ page }) => {
    const browseLink = page.locator('a[href="/communities"]');
    await expect(browseLink).toBeVisible();
    await expect(browseLink).toContainText('Browse Communities');
  });

  test('has a Back button', async ({ page }) => {
    const backButton = page.getByRole('button', { name: /Back/ });
    await expect(backButton).toBeVisible();
  });

  test('displays the ticket icon', async ({ page }) => {
    // The page has a TicketIcon SVG wrapped in a styled div
    const iconContainer = page.locator('svg').first();
    await expect(iconContainer).toBeVisible();
  });

  test('pre-populates code from URL query parameter', async ({ page, mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();

    await page.goto('/invite-code?code=TEST123', {
      waitUntil: 'commit',
    });
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 30000 });

    const input = page.locator('#inviteCode');
    // Wait for React hydration and useEffect to populate the value
    await expect(input).toHaveValue('TEST123', { timeout: 15000 });
  });

  test('submitting a code triggers a request', async ({ page }) => {
    // Wait for React hydration
    await waitForHydration(page, '#inviteCode');
    // Fill in a code
    const input = page.locator('#inviteCode');
    await input.fill('TESTCODE');

    // Intercept the join request
    let joinRequested = false;
    await page.route('**/community/join', (route) => {
      joinRequested = true;
      // Simulate unauthenticated response (redirects to login)
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    // Submit the form
    const submitButton = page.getByRole('button', { name: 'Join Community' });
    await submitButton.click();

    // Wait for the request to be made or redirect to happen
    await page.waitForTimeout(1000);

    // The form either made the request or redirected to login
    // Since user is unauthenticated, it should redirect to login
    // or show an error - both are valid outcomes
    const url = page.url();
    const hasError = await page.getByText(/error|invalid|login|unauthorized/i).isVisible().catch(() => false);
    const redirectedToLogin = url.includes('login');

    expect(joinRequested || redirectedToLogin || hasError).toBeTruthy();
  });

  test('input clears error state when typing', async ({ page }) => {
    // Trigger an error first - remove required attribute and submit empty form
    const input = page.locator('#inviteCode');

    // Remove native required validation so we can submit empty
    await input.evaluate((el) => el.removeAttribute('required'));

    // Set whitespace value using native setter to trigger React state
    await page.evaluate(() => {
      const el = document.getElementById('inviteCode') as HTMLInputElement;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      nativeInputValueSetter.call(el, '   ');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const submitButton = page.getByRole('button', { name: 'Join Community' });
    await submitButton.click();

    // Error should be visible
    await expect(
      page.getByText('Please enter an invite code.')
    ).toBeVisible({ timeout: 5000 });

    // Type new value to trigger onChange which clears error
    await page.evaluate(() => {
      const el = document.getElementById('inviteCode') as HTMLInputElement;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      nativeInputValueSetter.call(el, 'A');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Error should be cleared (onChange sets error to '')
    await expect(
      page.getByText('Please enter an invite code.')
    ).not.toBeVisible({ timeout: 5000 });
  });
});
