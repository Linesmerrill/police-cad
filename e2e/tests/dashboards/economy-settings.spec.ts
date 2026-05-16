import { test, expect } from '@playwright/test';

test.describe('Economy Settings', () => {
  test('renders the settings page for an authenticated user', { tag: '@auth' }, async ({ page }) => {
    const resp = await page.goto('/economy-settings');
    await expect(page).not.toHaveURL(/\/login/);
    if (/\/communities$/.test(page.url())) {
      test.skip(true, 'Test user has no active community; covered elsewhere.');
    }
    await expect(page.locator('text=Economy Settings').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Enable economy for this community').first()).toBeVisible();
    await expect(page.locator('text=Fines').first()).toBeVisible();
  });

  // The per-department search bar should only surface when the community has
  // more than 5 departments, and typing should filter the rendered rows by name.
  test(
    'per-department search filters the dept list when many departments exist',
    { tag: '@auth' },
    async ({ page }) => {
      const departments = [
        { _id: 'd1', name: 'Police Department', economyEnabled: true },
        { _id: 'd2', name: 'Dispatch', economyEnabled: true },
        { _id: 'd3', name: 'EMS', economyEnabled: false },
        { _id: 'd4', name: 'Fire Department', economyEnabled: true },
        { _id: 'd5', name: 'Sanitation', economyEnabled: true },
        { _id: 'd6', name: 'Supreme Court', economyEnabled: false },
        { _id: 'd7', name: 'Hospital', economyEnabled: false },
      ];

      // The page fetches /api/v1/community/{id} twice (community settings + dept list);
      // a single route handler serves both.
      await page.route('**/api/v1/community/*', async (route) => {
        if (route.request().method() !== 'GET') {
          return route.continue();
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            community: {
              _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
              name: 'Test Community',
              ownerID: 'aaaaaaaaaaaaaaaaaaaaaaaa',
              economy: { enabled: true, defaultStartingBalance: 0, fineMode: 'inbox', defaultDueDays: 14, contestExtensionDays: 30, allowNegativeBalance: false },
              departments,
            },
          }),
        });
      });

      await page.goto('/economy-settings');
      if (/\/communities$/.test(page.url())) {
        test.skip(true, 'Test user has no active community; covered elsewhere.');
      }

      // Wait for the dept list to populate before asserting on it.
      await expect(page.locator('.es-dept').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('.es-dept')).toHaveCount(departments.length);

      const search = page.locator('#es-dept-search-input');
      await expect(search).toBeVisible();

      // Substring match across multiple depts.
      await search.fill('depart');
      await expect(page.locator('.es-dept:not(.is-hidden)')).toHaveCount(2); // Police Department + Fire Department
      await expect(page.locator('.es-dept:not(.is-hidden) .es-dept-name-text')).toContainText(['Police Department', 'Fire Department']);

      // Case-insensitive single match.
      await search.fill('EMS');
      await expect(page.locator('.es-dept:not(.is-hidden)')).toHaveCount(1);
      await expect(page.locator('.es-dept:not(.is-hidden) .es-dept-name-text')).toHaveText('EMS');

      // No match shows the empty state.
      await search.fill('zzz-nope');
      await expect(page.locator('.es-dept:not(.is-hidden)')).toHaveCount(0);
      await expect(page.locator('#es-dept-no-match')).toBeVisible();

      // Clearing restores the full list.
      await search.fill('');
      await expect(page.locator('.es-dept:not(.is-hidden)')).toHaveCount(departments.length);
      await expect(page.locator('#es-dept-no-match')).toBeHidden();
    },
  );

  // When the community has a small number of departments, the search bar should
  // stay hidden so it doesn't clutter the card.
  test(
    'per-department search stays hidden when few departments exist',
    { tag: '@auth' },
    async ({ page }) => {
      const departments = [
        { _id: 'd1', name: 'Police Department', economyEnabled: true },
        { _id: 'd2', name: 'EMS', economyEnabled: false },
        { _id: 'd3', name: 'Fire Department', economyEnabled: true },
      ];

      await page.route('**/api/v1/community/*', async (route) => {
        if (route.request().method() !== 'GET') {
          return route.continue();
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            community: {
              _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
              name: 'Test Community',
              ownerID: 'aaaaaaaaaaaaaaaaaaaaaaaa',
              economy: { enabled: true, defaultStartingBalance: 0, fineMode: 'inbox', defaultDueDays: 14, contestExtensionDays: 30, allowNegativeBalance: false },
              departments,
            },
          }),
        });
      });

      await page.goto('/economy-settings');
      if (/\/communities$/.test(page.url())) {
        test.skip(true, 'Test user has no active community; covered elsewhere.');
      }

      await expect(page.locator('.es-dept').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('.es-dept')).toHaveCount(departments.length);
      await expect(page.locator('#es-dept-search')).toBeHidden();
    },
  );
});
