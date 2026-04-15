import { test, expect } from '../../fixtures/socket-fixture';
import { TEST_COMMUNITY_ID, TEST_USER_ID } from '../../helpers/seed';

test.describe('Dispatch Call Real-Time Updates', { tag: '@auth' }, () => {
  const communityId = TEST_COMMUNITY_ID.toHexString();

  test('new call appears on command dashboard when created via socket', async ({
    page,
    socket,
  }) => {
    // Navigate to the focused active calls view
    await page.goto('/command-dashboard#activeCalls');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#dd-panels')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#dd-component-activeCalls')).toBeVisible({ timeout: 10_000 });

    // Wait for the page's socket to connect and join the community room
    await page.waitForTimeout(2_000);

    // Join the community room from the test socket
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('join timed out')), 5_000);
      socket.on('joined_room', () => {
        clearTimeout(timeout);
        resolve();
      });
      socket.emit('join_community_room', { communityId });
    });

    // Create a dispatch call via socket
    socket.emit('create_call', {
      shortDescription: 'E2E Test Call - traffic stop on highway',
      classifier: '10-38',
      communityID: communityId,
      createdByUsername: 'E2E Dispatcher',
      createdByID: TEST_USER_ID.toHexString(),
      callNotes: 'Automated E2E test call',
      assignedOfficers: [],
      assignedFireEms: [],
      createdAt: new Date().toISOString(),
      createdAtReadable: new Date().toLocaleString(),
    });

    // The calls component should update — a call card or item should appear
    await expect(
      page.locator('#dd-component-activeCalls .cd-call-card-wrap, #dd-component-activeCalls .cd-call-item').first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
