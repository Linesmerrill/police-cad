import { test, expect } from '@playwright/test';
import {
  setBetaCommandDashboard,
  setBetaCommandDispatch,
  deleteUserPreferences,
} from '../../helpers/db';

test.describe('Beta opt-in — /dispatch-dashboard', { tag: '@auth' }, () => {
  test.afterEach(async () => {
    await deleteUserPreferences();
  });

  test('redirects to /command-dashboard when betaCommandDispatch is enabled', async ({ page }) => {
    await setBetaCommandDispatch(true);

    await page.goto('/dispatch-dashboard?dept=Dispatch');

    await expect(page).toHaveURL(/\/command-dashboard(\?|$)/);
    await expect(page).toHaveURL(/dept=Dispatch/);
  });

  test('does NOT redirect when betaCommandDispatch is disabled', async ({ page }) => {
    await setBetaCommandDispatch(false);

    await page.goto('/dispatch-dashboard');

    await expect(page).toHaveURL(/\/dispatch-dashboard/);
    await expect(page).not.toHaveURL(/\/command-dashboard/);
  });

  test('police opt-in (betaCommandDashboard) does NOT affect /dispatch-dashboard', async ({ page }) => {
    // Opting into the police command dashboard must NOT redirect dispatch
    // users to /command-dashboard — they need to opt into betaCommandDispatch
    // specifically. This lets the two audiences adopt at their own pace.
    await setBetaCommandDashboard(true);

    await page.goto('/dispatch-dashboard');

    await expect(page).toHaveURL(/\/dispatch-dashboard/);
    await expect(page).not.toHaveURL(/\/command-dashboard/);
  });
});
