import { test, expect } from '@playwright/test';
import {
  createTestWarrant,
  getWarrantById,
  deleteWarrantsByAccusedLastName,
} from '../../helpers/db';

const API_URL = process.env.POLICE_CAD_API_URL || 'http://localhost:8081';
const TEST_COMMUNITY_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

test.describe('Warrant records', { tag: '@auth' }, () => {
  const PREFIX = 'P10Warrant';

  test.afterEach(async () => {
    await deleteWarrantsByAccusedLastName(PREFIX);
  });

  test('seeded warrant is returned by /api/v2/warrants/community list endpoint', async ({ page, request }) => {
    const accusedLastName = `${PREFIX}${Date.now().toString(36)}`;
    const id = await createTestWarrant({
      accusedFirstName: 'Test',
      accusedLastName,
      charges: ['E2E Test Charge'],
      status: 'pending',
    });

    // Hit the API directly (no auth required for community-scoped reads in test env).
    const res = await request.get(
      `${API_URL}/api/v2/warrants/community/${TEST_COMMUNITY_ID}?limit=100&page=1`
    );
    expect(res.ok()).toBe(true);
    const body = await res.json();
    const warrants = body.data || body || [];
    const match = warrants.find((w: { _id: string }) => w._id === id);
    expect(match, `seeded warrant ${id} should be in community list`).toBeTruthy();

    const dbRow = await getWarrantById(id);
    expect(dbRow).toBeTruthy();
    expect(
      (dbRow as { warrant: { accusedLastName: string } }).warrant.accusedLastName
    ).toBe(accusedLastName);
  });
});
