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

test.describe('FAQ Page', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();
    await page.goto('/faq', { waitUntil: 'commit' });
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 30000 });
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
    await expect(page.getByText('Communities').first()).toBeVisible();
    await expect(page.getByText('Mobile & Apps')).toBeVisible();
    await expect(page.getByText('Dashboards & Features')).toBeVisible();
    await expect(page.getByText('Technical Issues')).toBeVisible();
    await expect(page.getByText('Support & Contact')).toBeVisible();
    await expect(page.getByText('Content Creator Program').first()).toBeVisible();
  });

  test('displays FAQ questions as expandable items', async ({ page }) => {
    // Check for some FAQ question text (questions are rendered as buttons)
    const faqQuestion = page.getByText('What is Lines Police CAD?');
    await expect(faqQuestion).toBeVisible();
  });

  test('expanding an FAQ item shows the answer', async ({ page }) => {
    // Wait for React hydration before clicking
    await waitForHydration(page, 'button');
    const questionButton = page.getByRole('button', { name: 'What is Lines Police CAD?' });
    await questionButton.click();

    // The answer should now be visible
    await expect(
      page.getByText('Lines Police CAD (LPC) is the world')
    ).toBeVisible({ timeout: 5000 });
  });

  test('collapsing an FAQ item hides the answer', async ({ page }) => {
    await waitForHydration(page, 'button');
    const questionButton = page.getByRole('button', { name: 'What is Lines Police CAD?' });
    await questionButton.click();

    // Verify answer is visible
    await expect(
      page.getByText('Lines Police CAD (LPC) is the world')
    ).toBeVisible({ timeout: 5000 });

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
    await waitForHydration(page, 'input[placeholder="Search for questions..."]');
    const searchInput = page.getByPlaceholder('Search for questions...');
    await searchInput.fill('password');

    // Should show a results count
    await expect(page.getByText(/Found \d+ result/)).toBeVisible({ timeout: 10000 });

    // Password-related questions should still be visible
    await expect(page.getByText('How do I reset my password?')).toBeVisible();
  });

  test('search with no results shows empty state', async ({ page }) => {
    await waitForHydration(page, 'input[placeholder="Search for questions..."]');
    const searchInput = page.getByPlaceholder('Search for questions...');
    await searchInput.fill('xyznonexistent');

    // The page shows "No matching questions found" in an h3 when there are no results
    await expect(page.getByText('No matching questions found')).toBeVisible({ timeout: 10000 });
  });

  test('Expand All button expands all items', async ({ page }) => {
    await waitForHydration(page, 'button');
    const expandAllButton = page.getByRole('button', { name: 'Expand All' });
    await expect(expandAllButton).toBeVisible();
    await expandAllButton.click();

    // Multiple answers should now be visible
    await expect(
      page.getByText('Lines Police CAD (LPC) is the world')
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText('Yes! LPC is completely free to use')
    ).toBeVisible({ timeout: 5000 });
  });

  test('Collapse All button collapses all items', async ({ page }) => {
    await waitForHydration(page, 'button');
    // First expand all
    await page.getByRole('button', { name: 'Expand All' }).click();

    // Wait for items to expand
    await expect(
      page.getByText('Lines Police CAD (LPC) is the world')
    ).toBeVisible({ timeout: 5000 });

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
    // The FAQ page has a Contact Us link in the "Still have questions?" section and in the footer
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
      waitUntil: 'commit',
    });
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 30000 });

    // Wait for React hydration so the useEffect that reads the hash fires
    await waitForHydration(page, 'button');

    // The item should be auto-expanded (hash-based open happens during useEffect after hydration)
    await expect(
      page.getByText('Yes! LPC is completely free to use')
    ).toBeVisible({ timeout: 15000 });
  });
});
