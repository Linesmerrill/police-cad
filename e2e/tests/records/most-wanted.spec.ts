import { test, expect } from '@playwright/test';
import {
  createTestMostWanted,
  getMostWantedById,
  deleteMostWantedByDescriptionPrefix,
} from '../../helpers/db';

const API_URL = process.env.POLICE_CAD_API_URL || 'http://localhost:8081';
const TEST_COMMUNITY_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

test.describe('Most Wanted records', { tag: '@auth' }, () => {
  const PREFIX = 'P10MostWanted';

  test.afterEach(async () => {
    await deleteMostWantedByDescriptionPrefix(PREFIX);
  });

  test('seeded most-wanted entry is returned by /api/v2/community/:id/most-wanted', async ({ request }) => {
    // Avoid /most-wanted page render — the view depends on community.penalCodes /
    // mostWantedVisibleFields which the e2e seed intentionally omits. Hit the
    // same list endpoint the page JS uses instead.
    const description = `${PREFIX}-${Date.now().toString(36)} suspect at large`;
    const id = await createTestMostWanted({ description, stars: 4 });

    const res = await request.get(
      `${API_URL}/api/v2/community/${TEST_COMMUNITY_ID}/most-wanted?page=0&limit=100&status=active`
    );
    expect(res.ok()).toBe(true);
    const body = await res.json();
    const entries = body.entries || body.data || body.mostWanted || [];
    const match = entries.find((e: { _id: string }) => e._id === id);
    expect(match, `seeded most-wanted ${id} should be in list`).toBeTruthy();

    const dbRow = await getMostWantedById(id);
    expect(dbRow).toBeTruthy();
    expect((dbRow as { mostWanted: { description: string } }).mostWanted.description).toContain(PREFIX);
  });
});
