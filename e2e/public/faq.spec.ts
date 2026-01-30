import { test, expect } from '../fixtures/test-fixtures';

test.describe('FAQ Page', () => {
  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();
    await page.goto('/faq', { waitUntil: 'domcontentloaded' });
  });

  test('renders the page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await expect(page.locator('body')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('displays the FAQ heading', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('FAQ');
  });

  test('displays the subtitle text', async ({ page }) => {
    await expect(
      page.getByText('Frequently Asked Questions')
    ).toBeVisible();
  });

  test('displays the navbar and footer', async ({ page }) => {
    await expect(page.locator('nav').first()).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();
  });

  test('displays FAQ category sections', async ({ page }) => {
    // The FAQ page has multiple categories
    await expect(page.getByText('Getting Started')).toBeVisible();
    await expect(page.getByText('Account Management')).toBeVisible();
    await expect(page.getByText('Communities')).toBeVisible();
    await expect(page.getByText('Mobile & Apps')).toBeVisible();
    await expect(page.getByText('Dashboards & Features')).toBeVisible();
    await expect(page.getByText('Technical Issues')).toBeVisible();
    await expect(page.getByText('Support & Contact')).toBeVisible();
    await expect(page.getByText('Content Creator Program')).toBeVisible();
  });

  test('displays FAQ questions as expandable items', async ({ page }) => {
    // Check for some FAQ question text (questions are rendered as buttons)
    const faqQuestion = page.getByText('What is Lines Police CAD?');
    await expect(faqQuestion).toBeVisible();
  });

  test('expanding an FAQ item shows the answer', async ({ page }) => {
    // Click on a FAQ question to expand it
    const questionButton = page.locator('button').filter({ hasText: 'What is Lines Police CAD?' });
    await questionButton.click();

    // The answer should now be visible
    await expect(
      page.getByText('Lines Police CAD (LPC) is the world')
    ).toBeVisible();
  });

  test('collapsing an FAQ item hides the answer', async ({ page }) => {
    // Expand the item first
    const questionButton = page.locator('button').filter({ hasText: 'What is Lines Police CAD?' });
    await questionButton.click();

    // Verify answer is visible
    await expect(
      page.getByText('Lines Police CAD (LPC) is the world')
    ).toBeVisible();

    // Collapse it
    await questionButton.click();

    // Answer should no longer be visible
    await expect(
      page.getByText('Lines Police CAD (LPC) is the world')
    ).not.toBeVisible();
  });

  test('has a search input for filtering questions', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search for questions...');
    await expect(searchInput).toBeVisible();
  });

  test('search filters FAQ questions', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search for questions...');
    await searchInput.fill('password');

    // Should show a results count
    await expect(page.getByText(/Found \d+ result/)).toBeVisible();

    // Password-related questions should still be visible
    await expect(page.getByText('How do I reset my password?')).toBeVisible();
  });

  test('search with no results shows empty state', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search for questions...');
    await searchInput.fill('xyznonexistentquery123');

    await expect(page.getByText('No results found')).toBeVisible();
  });

  test('Expand All button expands all items', async ({ page }) => {
    const expandAllButton = page.getByRole('button', { name: 'Expand All' });
    await expect(expandAllButton).toBeVisible();
    await expandAllButton.click();

    // Multiple answers should now be visible
    await expect(
      page.getByText('Lines Police CAD (LPC) is the world')
    ).toBeVisible();
    await expect(
      page.getByText('Yes! LPC is completely free to use')
    ).toBeVisible();
  });

  test('Collapse All button collapses all items', async ({ page }) => {
    // First expand all
    await page.getByRole('button', { name: 'Expand All' }).click();

    // Then collapse all
    await page.getByRole('button', { name: 'Collapse All' }).click();

    // Answers should not be visible
    await expect(
      page.getByText('Lines Police CAD (LPC) is the world')
    ).not.toBeVisible();
  });

  test('displays Still Have Questions section', async ({ page }) => {
    await expect(page.getByText('Still have questions?')).toBeVisible();
  });

  test('has Contact Us link in the help section', async ({ page }) => {
    const contactLink = page.locator('a[href="/contact-us"]').filter({ hasText: 'Contact Us' });
    await expect(contactLink.first()).toBeVisible();
  });

  test('has Discord link in the help section', async ({ page }) => {
    const discordLink = page.locator('a[href="https://discord.gg/3ECFhqe"]');
    await expect(discordLink.first()).toBeVisible();
  });

  test('deep link via hash opens the correct FAQ item', async ({ page, mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();

    // Navigate with a hash to auto-open a specific question
    await page.goto('/faq#is-lines-police-cad-free-to-use', {
      waitUntil: 'domcontentloaded',
    });

    // The item should be auto-expanded
    await expect(
      page.getByText('Yes! LPC is completely free to use')
    ).toBeVisible({ timeout: 10000 });
  });
});
