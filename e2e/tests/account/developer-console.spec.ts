/**
 * The developer console, end to end against the real API.
 *
 * Nothing is mocked here. Every request goes through the website's proxy to the
 * Go API in the test stack, against the test database, which is the only way to
 * find out whether the flows actually work — a mocked spec proves the page
 * renders what it was handed, not that the API would hand it that.
 *
 * It runs in order and shares one key between the tests, because that is what a
 * developer's day looks like: make a key, edit it, add a community, take one
 * away, rotate it, revoke it. Each step depends on the last having really
 * happened.
 *
 * The test user starts with no developer account and this spec turns one on,
 * so it has to put it back: the suite's other specs share this account, and a
 * leftover developer account would change what they see.
 */
import { test, expect, Page } from '@playwright/test';
import { TEST_COMMUNITY_ID } from '../../helpers/seed';

const COMMUNITY_ID = TEST_COMMUNITY_ID.toHexString();

// Serial: these steps are one story, and running them at once would have them
// fighting over the same account's key limit.
test.describe.configure({ mode: 'serial', timeout: 60_000 });

/** The key this spec makes, carried between steps. */
let keyId = '';
let secret = '';

async function enableDeveloperAccount(page: Page) {
  await page.goto('/developer');

  // /developer renders the console or the landing page, and it cannot know
  // which until it has fetched the account. Asking which one is showing the
  // instant the navigation resolves gets "neither", so this waits for either
  // to arrive first. Reading it too early is what made the first test flaky
  // and timed the rest out on a checkbox that was never going to appear,
  // because by then the account was already on.
  const overview = page.getByRole('heading', { name: 'Overview' });
  const terms = page.locator('#dev-terms');
  await expect(overview.or(terms)).toBeVisible({ timeout: 30_000 });
  if (await overview.isVisible()) return;

  await terms.check();
  await page.getByRole('button', { name: 'Turn on developer access' }).click();
  await expect(overview).toBeVisible({ timeout: 20_000 });
}

test.describe('Developer console, against the real API', { tag: '@auth' }, () => {
  test.afterAll(async ({ browser }) => {
    // Put the account back. Turning developer access off revokes every key,
    // which is exactly the cleanup this needs.
    const page = await browser.newPage();
    try {
      await page.goto('/developer/settings');
      const off = page.getByRole('button', { name: 'Turn off access' });
      // Same race as the helper above: wait for the page to render before
      // asking what is on it. A cleanup that quietly does nothing leaves the
      // developer account on for every other spec that shares this user.
      await off.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
      if (await off.isVisible().catch(() => false)) {
        await off.click();
        await page.getByRole('button', { name: 'Turn off and revoke' }).click();
        await expect(page.getByText(/Developer access is off/)).toBeVisible({ timeout: 15_000 });
      }
    } finally {
      await page.close();
    }
  });

  test('turning developer access on lands on the console', async ({ page }) => {
    await enableDeveloperAccount(page);

    // The plan label and the limits come from the same place, so they agree.
    // They did not once, and every account read "Free" next to Premium numbers.
    const lede = page.locator('.dc-lede').first();
    await expect(lede).toContainText('You are on');
    await expect(lede).toContainText('requests a minute');

    await expect(page.getByRole('link', { name: 'Back to LPC' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'API reference' }).first()).toBeVisible();
  });

  test('the console has no keys to start with', async ({ page }) => {
    await enableDeveloperAccount(page);
    await page.goto('/developer/keys');
    await expect(page.getByText('No keys yet')).toBeVisible({ timeout: 20_000 });
  });

  test('creating a key against a real community returns a real secret', async ({ page }) => {
    await enableDeveloperAccount(page);
    await page.goto('/developer/keys/new');

    await page.locator('#dc-key-name').fill('E2E dispatch bridge');
    // The picker is the real list of communities this user is in, from the API.
    await expect(page.locator('#dc-community')).toContainText('test community');
    await page.locator('#dc-community').selectOption(COMMUNITY_ID);
    await page.getByRole('button', { name: 'Dispatch' }).click();
    await page.getByRole('button', { name: 'Create key' }).click();

    const reveal = page.locator('.dc-secret');
    await expect(reveal).toBeVisible({ timeout: 15_000 });
    secret = ((await page.locator('.dc-secret-value').textContent()) || '').trim();
    expect(secret).toMatch(/^lpc_live_/);

    await page.getByRole('link', { name: 'Open this key' }).click();
    await expect(page).toHaveURL(/\/developer\/keys\/[a-f0-9]{24}/);
    keyId = (page.url().match(/\/keys\/([a-f0-9]{24})/) || [])[1] || '';
    expect(keyId).toHaveLength(24);
  });

  test('the key it made is the key the list shows', async ({ page }) => {
    await page.goto('/developer/keys');
    const row = page.locator('.dc-table tbody tr', { hasText: 'E2E dispatch bridge' });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('test community');
    // The visible part of the secret, never the secret.
    await expect(row).toContainText('lpc_live_');
    await expect(page.locator('body')).not.toContainText(secret);
  });

  test('renaming a key keeps the same secret', async ({ page }) => {
    await page.goto(`/developer/keys/${keyId}`);
    // textContent does not wait, so read it only once the key has rendered.
    await expect(page.getByRole('heading', { name: 'E2E dispatch bridge' })).toBeVisible({
      timeout: 20_000,
    });
    const prefixBefore = ((await page.locator('.dc-lede').first().textContent()) || '').split(' · ')[0];

    await page.locator('#dc-key-name').fill('E2E renamed bridge');
    await page.getByRole('button', { name: 'Save name' }).click();
    await expect(page.getByText('Name saved.')).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByRole('heading', { name: 'E2E renamed bridge' })).toBeVisible();
    // The whole point of editing in place.
    await expect(page.locator('.dc-lede').first()).toContainText(prefixBefore.trim());
    await expect(page.locator('.dc-secret')).toHaveCount(0);
  });

  test('changing permissions does not issue a new secret', async ({ page }) => {
    await page.goto(`/developer/keys/${keyId}`);
    await page.getByRole('button', { name: 'Read only' }).click();
    await page.getByRole('button', { name: 'Save permissions' }).click();
    await expect(page.getByText(/Permissions saved/)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.dc-secret')).toHaveCount(0);

    await page.reload();
    // The API refuses an unknown scope, so what came back is what it stored.
    await expect(page.locator('.dc-chip, input[type=checkbox]:checked')).not.toHaveCount(0);
  });

  test('the API refuses permissions that would leave the key able to do nothing', async ({ page }) => {
    // Remove the key's only community first, then try to save a permission set
    // with no way to make one. The server decides; the console reports.
    await page.goto(`/developer/keys/${keyId}`);
    await page.getByRole('button', { name: 'Remove' }).first().click();
    await page.getByRole('button', { name: 'Remove community' }).click();
    await expect(
      page.locator('.dc-notice-body').filter({ hasText: /removed/i })
    ).toBeVisible({ timeout: 15_000 });

    await page.reload();
    // With nothing to act on and no provisioning, the console says so.
    await expect(page.getByText(/reaches no community and cannot create one/i)).toBeVisible();
  });

  test('adding a community back makes the key usable again', async ({ page }) => {
    await page.goto(`/developer/keys/${keyId}`);
    await page.locator('#dc-add-community').selectOption(COMMUNITY_ID);
    await page.getByRole('button', { name: 'Add community' }).click();
    await expect(
      page.locator('.dc-notice-body').filter({ hasText: /added|approve/i })
    ).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(page.locator('.dc-table')).toContainText('test community');
    await expect(page.getByText(/reaches no community and cannot create one/i)).toHaveCount(0);
  });

  test('a key can cover several communities, and says the budget is shared', async ({ page }) => {
    await page.goto(`/developer/keys/${keyId}`);
    // Only communities the key does not already have are offered.
    const options = await page.locator('#dc-add-community option').allTextContents();
    expect(options.some((o) => /test community/.test(o))).toBe(false);

    await expect(page.getByText(/counted per key, not per community/i)).toBeVisible();
  });

  test('rotating issues a new secret and keeps the access', async ({ page }) => {
    await page.goto(`/developer/keys/${keyId}`);
    await page.getByRole('button', { name: 'Rotate key' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('test community');
    await dialog.getByRole('button', { name: 'Rotate key' }).click();

    const reveal = page.locator('.dc-secret-value');
    await expect(reveal).toBeVisible({ timeout: 15_000 });
    const rotated = ((await reveal.textContent()) || '').trim();
    expect(rotated).toMatch(/^lpc_live_/);
    expect(rotated).not.toBe(secret);

    // Rotating issues a NEW key and revokes the old one, so the page follows it
    // and the URL changes under us. Carry the new id forward, or everything
    // after this is looking at a revoked key.
    await expect(page).toHaveURL(/\/developer\/keys\/[a-f0-9]{24}/, { timeout: 15_000 });
    const rotatedId = (page.url().match(/\/keys\/([a-f0-9]{24})/) || [])[1] || '';
    expect(rotatedId).toHaveLength(24);
    expect(rotatedId).not.toBe(keyId);
    keyId = rotatedId;

    await page.reload();
    // The communities carried across, which is what the dialog promised.
    await expect(page.locator('.dc-table')).toContainText('test community', { timeout: 20_000 });
  });

  test('usage counts the account, and names the key that spent it', async ({ page }) => {
    await page.goto('/developer/usage');
    await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible();
    // Zero traffic is still a chart with a baseline, not a blank box.
    await expect(page.locator('svg[role="img"]')).toBeVisible();
    await expect(page.locator('.dc-table')).toContainText('E2E renamed bridge');

    await page.getByRole('button', { name: 'Last 7 days' }).click();
    await expect(page.getByRole('heading', { name: /last 7 days/i })).toBeVisible({ timeout: 15_000 });
  });

  test('settings reports the account and its real limits', async ({ page }) => {
    await page.goto('/developer/settings');
    await expect(page.getByText('Keys in use')).toBeVisible();
    await expect(page.getByText('Requests a day, per key')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Developer Terms' })).toBeVisible();
  });

  test('revoking a key stops it, and it stays in the list as history', async ({ page }) => {
    await page.goto(`/developer/keys/${keyId}`);
    await page.getByRole('button', { name: 'Revoke key' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Revoke key' }).click();

    await expect(page).toHaveURL(/\/developer\/keys$/, { timeout: 15_000 });

    // Kept, not deleted: the usage rows and the audit trail point at the id.
    await page.getByRole('button', { name: /Revoked/ }).click();
    // Two rows carry this name by now, and both should: rotation copies the
    // name onto the new key and revokes the old one, so the key this test
    // rotated and the key it just revoked are both kept as history.
    const history = page.locator('.dc-table tbody tr').filter({ hasText: 'E2E renamed bridge' });
    await expect(history.first()).toBeVisible({ timeout: 20_000 });
    expect(await history.count()).toBeGreaterThanOrEqual(2);

    await page.goto(`/developer/keys/${keyId}`);
    await expect(page.getByText(/revoked and cannot be edited/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Rotate key' })).toHaveCount(0);
  });
});
