import { test, expect } from '@playwright/test';
import {
  seedCourtSentencingScenario,
  cleanupCourtSentencingScenario,
  getSeededCourtCase,
  COURT_SESSION_ID,
} from '../../helpers/court-seed';

// Drives the judge sentencing flow end-to-end: a live session with an active
// case (one arrest w/ structured chargesList + one citation) is seeded, the
// test user (the judge) opens it, and we exercise the per-charge dispositions,
// the clamped Reduced/Amended editing, the live totals + consecutive/concurrent
// toggle, and submission. Totals asserted here are the CLIENT-side live preview
// (the server-side recompute is covered by Go unit tests, and the test API image
// may predate it).
test.describe('Court sentencing — judge flow', { tag: '@auth' }, () => {
  test.beforeAll(async () => {
    await seedCourtSentencingScenario();
  });
  test.afterAll(async () => {
    await cleanupCourtSentencingScenario();
  });

  const dispBtn = (item: number, charge: number, disp: string) =>
    `.jd-disp-btn[data-item-index="${item}"][data-charge-index="${charge}"][data-disp="${disp}"]`;

  test('disposes charges, computes live totals, and submits', async ({ page }) => {
    await page.goto(`/court-session?s=${COURT_SESSION_ID}`);
    await expect(page).not.toHaveURL(/\/login/);

    // Charges render after the async enrichment (arrest report + civilian fetch).
    await expect(page.locator('.jd-disp-btn').first()).toBeVisible({ timeout: 20_000 });

    const caseFine = page.locator('#jd-case-total-fine');
    const caseJail = page.locator('#jd-case-total-jail');

    // All charges default to Upheld: 5000 + 500 + 250 = $5,750; jail 6mo + 2min.
    await expect(caseFine).toHaveText('$5,750', { timeout: 10_000 });
    await expect(caseJail).toHaveText(/6 months 2 minutes/);

    // Concurrent = the single longest charge (6 months); toggle back to consecutive.
    await page.locator('.jd-mode-btn[data-mode="concurrent"]').click();
    await expect(caseJail).toHaveText('6 months');
    await page.locator('.jd-mode-btn[data-mode="consecutive"]').click();
    await expect(caseJail).toHaveText(/6 months 2 minutes/);

    // Dismiss the $5,000 arrest charge -> fine drops to 500 + 250 = $750.
    await page.locator(dispBtn(0, 0, 'dismissed')).click();
    await expect(caseFine).toHaveText('$750');

    // Reduce the $500 arrest charge; the final-fine field appears and clamps <=
    // the original. Set it to 100 -> 100 + 250 = $350.
    await page.locator(dispBtn(0, 1, 'reduced')).click();
    const finalFine = page.locator('.jd-final-fine[data-item-index="0"][data-charge-index="1"]');
    await expect(finalFine).toBeVisible();
    await finalFine.fill('100');
    await finalFine.blur();
    await expect(caseFine).toHaveText('$350');

    // Reduced can't exceed the original ($500) — typing 9999 clamps to 500.
    await finalFine.fill('9999');
    await finalFine.blur();
    await expect(finalFine).toHaveValue('500');

    // Submit the resolution.
    await page.locator('#submitResolutionBtn').click();

    // The case is marked resolved server-side.
    await expect
      .poll(async () => (await getSeededCourtCase())?.courtCase?.status, { timeout: 15_000 })
      .toBe('completed');
  });
});
