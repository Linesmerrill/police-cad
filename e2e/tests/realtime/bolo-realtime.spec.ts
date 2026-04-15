import { test, expect } from '../../fixtures/socket-fixture';
import { TEST_COMMUNITY_ID, TEST_USER_ID } from '../../helpers/seed';

test.describe('BOLO Real-Time Updates', { tag: '@auth' }, () => {
  const communityId = TEST_COMMUNITY_ID.toHexString();

  test('new BOLO appears on command dashboard when created via socket', async ({
    page,
    socket,
  }) => {
    // Navigate to the focused BOLO view
    await page.goto('/command-dashboard#createBolos');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#dd-panels')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#dd-component-createBolos')).toBeVisible({ timeout: 10_000 });

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

    // Create a BOLO via socket (simulating another officer creating one)
    socket.emit('create_bolo', {
      boloType: 'person',
      description: 'E2E Test BOLO - suspicious person near main street',
      location: '100 Main St',
      communityID: communityId,
      activeCommunityID: communityId,
      reportingOfficerUsername: 'E2E Officer',
      reportingOfficerID: TEST_USER_ID.toHexString(),
    });

    // The BOLO list should update — wait for a BOLO item to appear
    // The cd-bolos component re-renders when it receives 'created_bolo'
    await expect(
      page.locator('#dd-component-createBolos .cd-bolo-item, #dd-component-createBolos .cd-bolo-card-wrap').first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
