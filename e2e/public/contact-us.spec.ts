import { test, expect } from '../fixtures/test-fixtures';

test.describe('Contact Us Page', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();
    await page.goto('/contact-us', { waitUntil: 'commit' });
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 30000 });
  });

  test('renders the page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await expect(page.locator('body')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('displays the Contact Us heading', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Contact Us');
  });

  test('displays the subtitle description', async ({ page }) => {
    await expect(
      page.getByText('Get in touch with us through any of the options below')
    ).toBeVisible();
  });

  test('displays the navbar and footer', async ({ page }) => {
    await expect(page.locator('nav').first()).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();
  });

  test('displays the Reach out to Us option', async ({ page }) => {
    await expect(page.getByText('Reach out to Us')).toBeVisible();
    await expect(
      page.getByText('Need direct support? Open an Assistance Ticket.')
    ).toBeVisible();
  });

  test('displays the Request a New Feature option', async ({ page }) => {
    await expect(page.getByText('Request a New Feature')).toBeVisible();
    await expect(
      page.getByText('Is there something missing that you wish we could do?')
    ).toBeVisible();
  });

  test('displays the Report a Bug option', async ({ page }) => {
    await expect(page.getByText('Report a Bug')).toBeVisible();
    await expect(
      page.getByText('Found a bug or issue?')
    ).toBeVisible();
  });

  test('has an Open Ticket link', async ({ page }) => {
    const openTicketLink = page.locator('a').filter({ hasText: 'Open Ticket' });
    await expect(openTicketLink).toBeVisible();
    await expect(openTicketLink).toHaveAttribute('target', '_blank');
  });

  test('has a Request Feature link pointing to GitHub', async ({ page }) => {
    const featureLink = page.locator('a').filter({ hasText: 'Request Feature' });
    await expect(featureLink).toBeVisible();
    const href = await featureLink.getAttribute('href');
    expect(href).toContain('github.com');
    expect(href).toContain('feature_request');
  });

  test('has a Report Bug link pointing to GitHub', async ({ page }) => {
    const bugLink = page.locator('a').filter({ hasText: 'Report Bug' });
    await expect(bugLink).toBeVisible();
    const href = await bugLink.getAttribute('href');
    expect(href).toContain('github.com');
    expect(href).toContain('bug_report');
  });

  test('displays the Need More Help section', async ({ page }) => {
    await expect(page.getByText('Need More Help?')).toBeVisible();
  });

  test('has an About Us link in the Need More Help section', async ({ page }) => {
    const aboutLink = page.locator('a[href="/about-us"]').first();
    await expect(aboutLink).toBeVisible();
  });

  test('has a GitHub link in the Need More Help section', async ({ page }) => {
    const githubLink = page.locator('a[href="https://github.com/linesmerrill/police-cad"]').first();
    await expect(githubLink).toBeVisible();
  });
});
