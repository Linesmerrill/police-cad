import { test, expect } from '../fixtures/test-fixtures';

test.describe('About Us Page', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();
    await page.goto('/about-us', { waitUntil: 'commit' });
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 30000 });
  });

  test('renders the page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await expect(page.locator('body')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('displays the About Us heading', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('About Us');
  });

  test('displays the LPC subtitle', async ({ page }) => {
    const subtitle = page.getByText('LPC - Lines Police CAD');
    await expect(subtitle).toBeVisible();
  });

  test('displays the navbar and footer', async ({ page }) => {
    await expect(page.locator('nav').first()).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();
  });

  test('displays feature cards', async ({ page }) => {
    // The about-us page has 3 feature cards: Free to Use, Developed with Users in Mind, Web/Mobile/Tablet Friendly
    await expect(page.getByText('Free to Use').first()).toBeVisible();
    await expect(page.getByText('Developed with Users in Mind')).toBeVisible();
    await expect(page.getByText('Web, Mobile & Tablet Friendly')).toBeVisible();
  });

  test('displays the Contributions section', async ({ page }) => {
    const contributionsHeading = page.getByText('Contributions');
    await expect(contributionsHeading.first()).toBeVisible();
  });

  test('displays contribution options', async ({ page }) => {
    await expect(page.getByText('Use & Provide Feedback')).toBeVisible();
    await expect(page.getByText('Contribute Code')).toBeVisible();
    await expect(page.getByText('Support on Patreon')).toBeVisible();
  });

  test('has a GitHub link in the Contribute Code section', async ({ page }) => {
    const githubLink = page.locator('a[href="https://github.com/linesmerrill/police-cad"]').first();
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('target', '_blank');
  });

  test('has a Patreon link in the Support section', async ({ page }) => {
    const patreonLink = page.locator('a[href="https://www.patreon.com/linespolicecad"]').first();
    await expect(patreonLink).toBeVisible();
    await expect(patreonLink).toHaveAttribute('target', '_blank');
  });

  test('has a Contact Us CTA link', async ({ page }) => {
    const contactLink = page.locator('a[href="/contact-us"]').first();
    await expect(contactLink).toBeVisible();
    await expect(contactLink).toContainText('Contact Us');
  });

  test('Contact Us link navigates to contact page', async ({ page }) => {
    const contactLink = page.locator('a[href="/contact-us"]').first();
    await contactLink.click();
    await expect(page).toHaveURL(/\/contact-us/);
  });
});
