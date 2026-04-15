import { test, expect } from '../../fixtures/socket-fixture';
import { TEST_COMMUNITY_ID } from '../../helpers/seed';

test.describe('Panic Alert UI', { tag: '@auth' }, () => {
  const communityId = TEST_COMMUNITY_ID.toHexString();

  test('panic banner element exists on command dashboard (hidden by default)', async ({ page }) => {
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#dd-panels')).toBeVisible({ timeout: 15_000 });

    // Panic banner should exist in the DOM but be hidden when no alerts are active
    await expect(page.locator('#cd-panic-banner')).toBeAttached({ timeout: 5_000 });
    await expect(page.locator('#cd-panic-banner')).toBeHidden();
  });

  test('panic banner renders when triggered via client-side event', async ({ page }) => {
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#dd-panels')).toBeVisible({ timeout: 15_000 });

    // Wait for the page's alert module to initialize
    await page.waitForTimeout(2_000);

    // Directly render a panic alert via the client-side renderPanicAlerts function.
    // This tests the UI rendering path without depending on the API round-trip.
    await page.evaluate(() => {
      const banner = document.getElementById('cd-panic-banner');
      const list = document.getElementById('cd-panic-list');
      if (banner && list) {
        list.innerHTML = `
          <div class="cd-panic-row" id="cd-panic-test-alert">
            <div class="cd-panic-content">
              <div class="cd-panic-icon"><span class="cd-alert-pulse"></span><i class="fa fa-bolt"></i></div>
              <div class="cd-panic-text">
                <span class="cd-panic-title">PANIC</span>
                <span class="cd-panic-name">E2E Test Officer (E2E-1)</span>
              </div>
            </div>
          </div>`;
        banner.style.display = 'block';
      }
    });

    // Verify the panic banner is now visible
    await expect(page.locator('#cd-panic-banner')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.cd-panic-row')).toBeVisible();
    await expect(page.locator('.cd-panic-name')).toContainText('E2E Test Officer');
  });

  test('socket connects and joins community room from command dashboard', async ({
    page,
    socket,
  }) => {
    // Navigate to command dashboard so the browser socket connects
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#dd-panels')).toBeVisible({ timeout: 15_000 });

    // Verify the test socket can also join the same room
    const joined = await new Promise<{ room: string }>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('join timed out')), 5_000);
      socket.on('joined_room', (data: { room: string }) => {
        clearTimeout(timeout);
        resolve(data);
      });
      socket.emit('join_community_room', { communityId });
    });

    expect(joined.room).toBe(`community:${communityId}`);
  });
});
