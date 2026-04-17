import { test, expect } from '@playwright/test';
import {
  createTestMostWanted,
  getMostWantedById,
  deleteMostWantedByDescriptionPrefix,
} from '../../helpers/db';

test.describe('Most Wanted records', { tag: '@auth' }, () => {
  const PREFIX = 'P10MostWanted';

  test.afterEach(async () => {
    await deleteMostWantedByDescriptionPrefix(PREFIX);
  });

  test('seeded most-wanted entry renders on /most-wanted page', async ({ page }) => {
    const description = `${PREFIX}-${Date.now().toString(36)} suspect at large`;
    const id = await createTestMostWanted({ description, stars: 4 });

    await page.goto('/most-wanted');
    await expect(page.locator('#mw-entries, #mw-empty').first()).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator('#mw-entries').filter({ hasText: new RegExp(PREFIX, 'i') })
    ).toBeVisible({ timeout: 15_000 });

    const dbRow = await getMostWantedById(id);
    expect(dbRow).toBeTruthy();
    expect((dbRow as { mostWanted: { description: string } }).mostWanted.description).toContain(PREFIX);
  });
});
