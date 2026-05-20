import { test, expect } from '@playwright/test';
import { communityDetailsUrl } from '../../helpers/test-urls';

/**
 * RP Server Promotion modal.
 *
 * The test user owns the test community, so the owner-only "Promote" action
 * is expected to render. These checks exercise the client-side modal — the
 * structured form and the live Discord-style preview — without depending on
 * the promotion API endpoint being reachable from the test environment.
 */
test.describe('RP Server Promotion', { tag: '@auth' }, () => {
  test('owner can open the promotion modal and the preview reacts to input', async ({ page }) => {
    await page.goto(communityDetailsUrl());
    await expect(page).not.toHaveURL(/\/login/);

    const overviewVisible = await page
      .locator('#community-overview')
      .isVisible()
      .catch(() => false);
    if (!overviewVisible) {
      test.skip(true, 'Community API not reachable — error page rendered instead');
      return;
    }

    // Owner-only Promote action.
    const promoteBtn = page.locator('#community-actions button', { hasText: 'Promote' });
    await expect(promoteBtn).toBeVisible({ timeout: 5_000 });

    await promoteBtn.click();
    const modal = page.locator('#promoteModal');
    await expect(modal).toBeVisible();

    // Fill the structured form.
    await page.locator('#promoServerName').fill('Playwright Roleplay Network');
    await page.locator('#promoPlatforms input[value="PS5"]').check();
    await page.locator('#promoGame').selectOption('GTA RP');
    await page.locator('#promoDescription').fill('An automated test promotion description.');

    // The live preview should reflect what was typed.
    const preview = page.locator('#promoPreview');
    await expect(preview).toContainText('Playwright Roleplay Network');
    await expect(preview).toContainText('An automated test promotion description.');
    await expect(preview).toContainText('GTA RP');
    await expect(preview).toContainText('PS5');

    // Adding a feature tag shows up in both the list and the preview.
    await page.locator('#promoFeatInput').fill('Custom CAD/MDT');
    await page.locator('#promoFeatInput').press('Enter');
    await expect(page.locator('#promoFeatList')).toContainText('Custom CAD/MDT');
    await expect(preview).toContainText('Custom CAD/MDT');

    // Invalid invite link keeps the post gated — entering confirm requires a valid one.
    await page.locator('#promoInvite').fill('https://discord.gg/playwright');
    await expect(preview).toContainText('discord.gg/playwright');

    // Close the modal.
    await page.locator('#promoteModalCancel').click();
    await expect(modal).toBeHidden();
  });
});
