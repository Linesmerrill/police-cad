import { test, expect } from '../../fixtures/socket-fixture';
import { TEST_COMMUNITY_ID, TEST_USER_ID } from '../../helpers/seed';

test.describe('Panic Alert Real-Time Updates', { tag: '@auth' }, () => {
  const communityId = TEST_COMMUNITY_ID.toHexString();

  test('panic alert banner appears when panic is triggered', async ({ page, socket }) => {
    // Navigate to command dashboard so the browser socket connects
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#dd-panels')).toBeVisible({ timeout: 15_000 });

    // Wait a moment for the page's socket to connect and join the community room
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

    // Emit a panic alert from the test socket (simulating another officer)
    socket.emit('panic_button_update', {
      activeCommunity: communityId,
      userID: 'e2e-panic-test-user-id-01',
      userUsername: 'E2E Panic Officer',
      callSign: 'E2E-1',
      departmentType: 'police',
    });

    // Verify the panic banner becomes visible
    await expect(page.locator('#cd-panic-banner')).toBeVisible({ timeout: 10_000 });

    // Verify a panic row with the officer's info appears
    await expect(page.locator('.cd-panic-row').first()).toBeVisible({ timeout: 5_000 });
  });
});
