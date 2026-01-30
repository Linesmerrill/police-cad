import { test, expect } from '../fixtures/test-fixtures';

test.describe('Discord Bot Page', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.mockUnauthenticated();
    await mockApi.blockExternalApis();
    await page.goto('/discord-bot', { waitUntil: 'commit' });
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 30000 });
  });

  test('renders the page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await expect(page.locator('body')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('displays the Discord Bot Setup heading', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('DISCORD BOT SETUP');
  });

  test('displays the description text', async ({ page }) => {
    await expect(
      page.getByText('Follow these simple steps to add the Lines Police CAD Discord Bot')
    ).toBeVisible();
  });

  test('displays the navbar and footer', async ({ page }) => {
    await expect(page.locator('nav').first()).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();
  });

  test('displays step 1 - Add the Bot', async ({ page }) => {
    await expect(page.getByText('Add the Bot to Your Server')).toBeVisible();
    await expect(
      page.getByText('Click the button below to add the Lines Police CAD Discord Bot')
    ).toBeVisible();
  });

  test('displays step 2 - Authorize the Bot', async ({ page }) => {
    await expect(page.getByText('Authorize the Bot')).toBeVisible();
    await expect(
      page.getByText('Select the server where you want to add the bot')
    ).toBeVisible();
  });

  test('displays step 3 - Connect Your Account', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Connect Your Account' })).toBeVisible();
    await expect(
      page.getByText('go to your profile page and click')
    ).toBeVisible();
  });

  test('has the Add Bot to Server link', async ({ page }) => {
    const addBotLink = page.locator('a').filter({ hasText: 'Add Bot to Server' });
    await expect(addBotLink).toBeVisible();

    const href = await addBotLink.getAttribute('href');
    expect(href).toContain('discord.com/api/oauth2/authorize');
    await expect(addBotLink).toHaveAttribute('target', '_blank');
  });

  test('has a Go to Profile link', async ({ page }) => {
    const profileLink = page.locator('a[href="/profile"]');
    await expect(profileLink).toBeVisible();
    await expect(profileLink).toContainText('Go to Profile');
  });

  test('displays Important Notes section', async ({ page }) => {
    await expect(page.getByText('Important Notes')).toBeVisible();
    await expect(
      page.getByText('You must have "Manage Server" permissions').first()
    ).toBeVisible();
  });

  test('displays the invite link section', async ({ page }) => {
    await expect(page.getByText('Need the invite link?')).toBeVisible();

    // The invite URL is displayed in a code block
    const codeBlock = page.locator('code');
    await expect(codeBlock).toBeVisible();
    const codeText = await codeBlock.textContent();
    expect(codeText).toContain('discord.com/api/oauth2/authorize');
  });

  test('has a Copy Link button', async ({ page }) => {
    const copyButton = page.getByRole('button', { name: /Copy Link/ });
    await expect(copyButton).toBeVisible();
  });

  test('displays step numbers 1, 2, 3', async ({ page }) => {
    await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('2', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('3', { exact: true }).first()).toBeVisible();
  });
});
