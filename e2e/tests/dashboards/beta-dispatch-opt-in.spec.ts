import { test, expect } from '@playwright/test';
import { setBetaCommandDashboard, deleteUserPreferences } from '../../helpers/db';

test.describe('Beta opt-in — /dispatch-dashboard', { tag: '@auth' }, () => {
  test.afterEach(async () => {
    await deleteUserPreferences();
  });

  test('redirects to /command-dashboard when betaCommandDashboard is enabled', async ({ page }) => {
    await setBetaCommandDashboard(true);

    await page.goto('/dispatch-dashboard?dept=Dispatch');

    // Mirrors the /police-dashboard opt-in behavior: query string preserved.
    await expect(page).toHaveURL(/\/command-dashboard(\?|$)/);
    await expect(page).toHaveURL(/dept=Dispatch/);
  });

  test('does NOT redirect when betaCommandDashboard is disabled', async ({ page }) => {
    await setBetaCommandDashboard(false);

    await page.goto('/dispatch-dashboard');

    await expect(page).toHaveURL(/\/dispatch-dashboard/);
    await expect(page).not.toHaveURL(/\/command-dashboard/);
  });
});
