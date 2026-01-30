import { test, expect } from '../fixtures/test-fixtures';

test.describe('Privacy Policy Page', () => {
  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();
    await page.goto('/privacy-policy', { waitUntil: 'domcontentloaded' });
  });

  test('renders the page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await expect(page.locator('body')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('displays the Privacy Policy heading', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Privacy Policy');
  });

  test('displays the effective date', async ({ page }) => {
    await expect(
      page.getByText(/Effective date:/)
    ).toBeVisible();
  });

  test('displays the navbar and footer', async ({ page }) => {
    await expect(page.locator('nav').first()).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();
  });

  test('displays the introduction text', async ({ page }) => {
    await expect(
      page.getByText('Lines Police CAD ("us", "we", or "our")')
    ).toBeVisible();
  });

  test('displays all policy sections', async ({ page }) => {
    const sectionTitles = [
      'Information Collection And Use',
      'Use of Data',
      'Transfer Of Data',
      'Disclosure Of Data',
      'Security Of Data',
      'Service Providers',
      'Links To Other Sites',
      "Children's Privacy",
      'Changes To This Privacy Policy',
    ];

    for (const title of sectionTitles) {
      await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    }
  });

  test('displays data types collected', async ({ page }) => {
    await expect(page.getByText('Personal Data').first()).toBeVisible();
    await expect(page.getByText('Usage Data').first()).toBeVisible();
    await expect(page.getByText('Tracking & Cookies Data')).toBeVisible();
  });

  test('displays cookie types', async ({ page }) => {
    await expect(page.getByText('Session Cookies.')).toBeVisible();
    await expect(page.getByText('Preference Cookies.')).toBeVisible();
    await expect(page.getByText('Security Cookies.')).toBeVisible();
  });

  test('has a link to Terms and Conditions', async ({ page }) => {
    const termsLink = page.locator('a[href="/terms-and-conditions"]');
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toContainText('Terms and Conditions');
  });

  test('displays the Contact Us section', async ({ page }) => {
    // There should be a contact section at the bottom
    await expect(
      page.getByText('If you have any questions about this Privacy Policy')
    ).toBeVisible();
  });

  test('has a support email link', async ({ page }) => {
    const emailLink = page.locator('a[href="mailto:support@linespolice-cad.com"]');
    await expect(emailLink).toBeVisible();
  });

  test('has a link to About Us in the contact section', async ({ page }) => {
    const aboutLink = page.locator('a[href="/about-us"]');
    await expect(aboutLink.first()).toBeVisible();
  });

  test('has a Google Analytics section', async ({ page }) => {
    await expect(page.getByText('Google Analytics')).toBeVisible();
    const googleLink = page.locator('a[href="https://policies.google.com/privacy?hl=en"]');
    await expect(googleLink).toBeVisible();
  });
});
