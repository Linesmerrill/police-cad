import { test, expect } from '@playwright/test';
import { communityDetailsUrl } from '../../helpers/test-urls';

test.describe('Community Details Page', { tag: '@auth' }, () => {
  test('loads community overview with name', async ({ page }) => {
    await page.goto(communityDetailsUrl());
    await expect(page).not.toHaveURL(/\/login/);

    // Community overview section
    await expect(page.locator('#community-overview')).toBeVisible({ timeout: 15_000 });

    // Community name should render
    await expect(page.locator('#community-overview-name')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#community-overview-name')).toContainText('test community', {
      ignoreCase: true,
    });
  });

  test('shows departments section', async ({ page }) => {
    await page.goto(communityDetailsUrl());
    await expect(page).not.toHaveURL(/\/login/);

    await expect(page.locator('#departments-section')).toBeVisible({ timeout: 15_000 });
  });

  test('shows announcements section', async ({ page }) => {
    await page.goto(communityDetailsUrl());
    await expect(page).not.toHaveURL(/\/login/);

    await expect(page.locator('#announcements-section')).toBeVisible({ timeout: 15_000 });
  });

  test('shows quick action buttons for community owner', async ({ page }) => {
    await page.goto(communityDetailsUrl());
    await expect(page).not.toHaveURL(/\/login/);

    // Community actions section (settings, invite, boost, share, map, etc.)
    await expect(page.locator('#community-actions')).toBeVisible({ timeout: 15_000 });
  });

  test('shows announcement filter tabs', async ({ page }) => {
    await page.goto(communityDetailsUrl());
    await expect(page).not.toHaveURL(/\/login/);

    await expect(page.locator('#announcement-filter-tabs')).toBeVisible({ timeout: 15_000 });

    // Verify tab options exist
    await expect(page.locator('#tab-all')).toBeVisible();
    await expect(page.locator('#tab-main')).toBeVisible();
    await expect(page.locator('#tab-session')).toBeVisible();
    await expect(page.locator('#tab-training')).toBeVisible();
  });
});
