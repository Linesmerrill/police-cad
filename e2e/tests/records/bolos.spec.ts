import { test, expect } from '@playwright/test';
import {
  createTestBolo,
  getBoloById,
  deleteBolosByTitlePrefix,
} from '../../helpers/db';

test.describe('BOLO records', { tag: '@auth' }, () => {
  const PREFIX = 'P10Bolo';

  test.afterEach(async () => {
    await deleteBolosByTitlePrefix(PREFIX);
  });

  test('seeded BOLO renders in dispatch dashboard BOLO table', async ({ page }) => {
    const title = `${PREFIX}-${Date.now().toString(36)}`;
    const id = await createTestBolo({ title, description: 'E2E seed bolo' });

    await page.goto('/dispatch-dashboard');
    await expect(page.locator('#boloTable')).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator('#boloTable tbody tr').filter({ hasText: new RegExp(title, 'i') })
    ).toHaveCount(1, { timeout: 15_000 });

    const dbRow = await getBoloById(id);
    expect(dbRow).toBeTruthy();
    expect((dbRow as { bolo: { title: string } }).bolo.title).toBe(title);
  });
});
