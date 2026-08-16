import { test, expect } from '@playwright/test';
import { dashboardUrl } from '../../helpers/test-urls';
import { TEST_COMMUNITY_ID, TEST_DEPARTMENT_ID } from '../../helpers/seed';

/**
 * Ranks tab in Department Management (dd-settings).
 *
 * Verifies the shared manage-ranks partial + module are wired up on the
 * department dashboard:
 *   - The hidden <template id="manage-ranks-tpl"> is in the DOM
 *   - /static/js/manage-ranks.js is loaded and exposes window.manageRanks
 *   - When the dept settings panel is opened, the Ranks tab pill appears
 *     for the community owner (who has manageDepartments) and clicking it
 *     mounts the rank-management UI inside the tab body.
 *
 * The deeper CRUD flow (create/edit/delete/reorder) is intentionally NOT
 * tested end-to-end — the same module powers the existing Manage Ranks
 * modal on community-details, and an isolated CRUD path would duplicate
 * the API contract tests for the rank endpoints.
 */
test.describe('Department Dashboard — Ranks tab', { tag: '@auth' }, () => {
  function deptDashboardUrl(): string {
    const communityB64 = Buffer.from(TEST_COMMUNITY_ID.toHexString()).toString('base64');
    const deptB64 = Buffer.from(TEST_DEPARTMENT_ID.toHexString()).toString('base64');
    return `/department-dashboard?c=${encodeURIComponent(communityB64)}&d=${encodeURIComponent(deptB64)}`;
  }

  test('manage-ranks template and module are present', async ({ page }) => {
    await page.goto(dashboardUrl('/department-dashboard'));
    await expect(page).not.toHaveURL(/\/login/);

    // The hidden <template> that backs the Ranks tab must be in the DOM.
    const tplExists = await page.locator('#manage-ranks-tpl').count();
    expect(tplExists).toBe(1);

    // The shared module must be loaded and expose its public API.
    const moduleReady = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mr = (window as any).manageRanks;
      return !!(mr && typeof mr.init === 'function' && typeof mr.fetchPendingCount === 'function');
    });
    expect(moduleReady).toBe(true);
  });

  test('Ranks tab appears and mounts the partial when opened', async ({ page }) => {
    await page.goto(deptDashboardUrl());
    await expect(page).not.toHaveURL(/\/login/);

    // Wait for dashboard to finish loading. If the API doesn't return
    // department data, the settings panel won't render — soft-skip in that case.
    const settingsBtn = page.locator('#dd-nav-settings');
    const settingsVisible = await settingsBtn.isVisible().catch(() => false);
    if (!settingsVisible) {
      test.skip(true, 'Dept dashboard settings nav not reachable — API may be offline');
      return;
    }

    await settingsBtn.click();

    const ranksTab = page.locator('.dds-tab[data-tab="ranks"]');
    await expect(ranksTab).toBeVisible({ timeout: 5_000 });

    await ranksTab.click();

    // After clicking, the partial should have mounted inside the tab body.
    await expect(page.locator('#dds-tab-body [data-rkm-root]')).toBeVisible();
    await expect(page.locator('#dds-tab-body #ranksList')).toBeVisible();
    await expect(page.locator('#dds-tab-body #rankMembersList')).toBeVisible();
  });

  /**
   * Regression: on a laptop-width window the dashboard sidebar leaves this card
   * around 490px wide, but the responsive rules used to key off the VIEWPORT,
   * which was still 768px and above the 700px breakpoint. So the Add panel
   * stayed a fixed 380px and covered all but ~107px of the ranks list, which
   * reads as the whole page lurching sideways when you press Add.
   *
   * Asserted against the CARD's width rather than the window's, because that is
   * the thing the layout actually depends on — and it keeps this test away from
   * the dashboard's own chrome at narrow viewports, which is not what is under
   * test here.
   */
  test('the Add panel becomes a full-width sheet when the card is narrow', async ({ page }) => {
    await page.goto(deptDashboardUrl());
    await expect(page).not.toHaveURL(/\/login/);

    const settingsBtn = page.locator('#dd-nav-settings');
    if (!(await settingsBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Dept dashboard settings nav not reachable — API may be offline');
      return;
    }
    await settingsBtn.click();

    const ranksTab = page.locator('.dds-tab[data-tab="ranks"]');
    await expect(ranksTab).toBeVisible({ timeout: 5_000 });
    await ranksTab.click();

    const card = page.locator('#dds-tab-body .rkm-card');
    await expect(card).toBeVisible();

    // Squeeze the card to the width the dashboard gives it on a 768px window.
    await page.evaluate(() => {
      const el = document.querySelector('#dds-tab-body .rkm-card') as HTMLElement;
      el.style.maxWidth = '488px';
      el.style.width = '488px';
    });

    const cardWidth = await card.evaluate((el) => el.getBoundingClientRect().width);
    expect(cardWidth).toBeLessThan(700); // guard the premise

    await page.locator('#dds-tab-body .rkm-btn-add').click();

    const form = page.locator('#dds-tab-body .rkm-form');
    await expect(form).toHaveClass(/is-open/);
    await page.waitForTimeout(400); // let the slide-in settle before measuring

    const { formWidth, formLeft, cardLeft } = await page.evaluate(() => {
      const c = document.querySelector('#dds-tab-body .rkm-card')!.getBoundingClientRect();
      const f = document.querySelector('#dds-tab-body .rkm-form')!.getBoundingClientRect();
      return { formWidth: f.width, formLeft: f.left, cardLeft: c.left };
    });

    // A sheet across the whole card, not a 380px panel pinned to its right.
    expect(formWidth).toBeGreaterThan(cardWidth - 8);
    expect(formLeft).toBeLessThanOrEqual(cardLeft + 8);

    // And nothing gained a horizontal scrollbar along the way.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  /**
   * Regression, reported from a Chromebook: pressing Add shifted the whole
   * editor sideways — the right panel jumped into the middle of the screen and
   * the left panel went off the edge entirely, with no way to scroll back.
   *
   * The panel slides in over 250ms; the name field was focused at 100ms, while
   * it was still outside the card. The browser scrolls the nearest scroll
   * container to reveal a focused element, and overflow:hidden is still a
   * scroll container — so the card scrolled 440px sideways and, having no
   * scrollbar, stayed there.
   */
  test('pressing Add does not scroll the card sideways', async ({ page }) => {
    await page.goto(deptDashboardUrl());
    await expect(page).not.toHaveURL(/\/login/);

    const settingsBtn = page.locator('#dd-nav-settings');
    if (!(await settingsBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Dept dashboard settings nav not reachable — API may be offline');
      return;
    }
    await settingsBtn.click();

    const ranksTab = page.locator('.dds-tab[data-tab="ranks"]');
    await expect(ranksTab).toBeVisible({ timeout: 5_000 });
    await ranksTab.click();

    const card = page.locator('#dds-tab-body .rkm-card');
    await expect(card).toBeVisible();

    await page.locator('#dds-tab-body .rkm-btn-add').click();
    // Long enough to cover the slide-in and the focus that follows it.
    await page.waitForTimeout(600);

    // The card must not have scrolled, and the name field should have focus.
    const state = await page.evaluate(() => {
      const el = document.querySelector('#dds-tab-body .rkm-card') as HTMLElement;
      return {
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
        focusedId: document.activeElement ? document.activeElement.id : null,
      };
    });
    expect(state.scrollLeft).toBe(0);
    expect(state.scrollTop).toBe(0);
    expect(state.focusedId).toBe('rankFormName');
  });
});
