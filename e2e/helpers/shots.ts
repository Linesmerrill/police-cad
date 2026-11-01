/**
 * Screenshots attached to the Playwright HTML report.
 *
 * Attached rather than written to a loose folder because the report is what CI
 * uploads, so an attachment is something a reviewer can actually open from the
 * run without cloning anything. Every shot is taken at both widths: a console
 * table with four columns and a route template in one of them is always wider
 * than a phone, so the phone shot is the one that shows whether it degrades
 * properly rather than overflowing the page.
 */
import { expect, Page, TestInfo } from '@playwright/test';

export const DESKTOP = { width: 1440, height: 900 };
export const PHONE = { width: 390, height: 844 };

/**
 * Takes the same shot at both widths and attaches both.
 *
 * `ready` is awaited after each resize, because a resize re-runs the layout and
 * a shot taken before the content settles is a picture of a skeleton. Pass the
 * one element that proves the panel has rendered.
 */
export async function shootBothWidths(
  page: Page,
  testInfo: TestInfo,
  name: string,
  ready?: () => Promise<void>
) {
  for (const [label, size] of [
    ['desktop', DESKTOP],
    ['phone', PHONE],
  ] as const) {
    await page.setViewportSize(size);
    if (ready) await ready();
    // A full-page shot rather than the viewport, so the footer (or its
    // absence) and everything below the fold is in the picture.
    const png = await page.screenshot({ fullPage: true });
    await testInfo.attach(`${name} (${label} ${size.width}px)`, {
      body: png,
      contentType: 'image/png',
    });
  }
  // Leave the page at desktop so a following assertion is not reading a
  // phone layout it did not ask for.
  await page.setViewportSize(DESKTOP);
}

/** Waits for a heading to be on screen, as the readiness signal for a shot. */
export function headingReady(page: Page, name: string | RegExp) {
  return async () => {
    await expect(page.getByRole('heading', { name })).toBeVisible();
  };
}
