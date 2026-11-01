/**
 * Screenshots attached to the Playwright HTML report.
 *
 * Attached rather than written to a loose folder because the report is what CI
 * uploads, so an attachment is something a reviewer can open from the run
 * without cloning anything.
 *
 * Deliberately cheap. The first version of this took a full-page shot at two
 * widths inside six existing tests, resizing the viewport mid-test to do it.
 * Twelve full-page renders plus the relayouts was enough extra load on a CI
 * runner to push unrelated timing-sensitive tests into retries, and in a suite
 * with serial, stateful groups a retry is not free: the group re-runs against a
 * database the first attempt already wrote to.
 *
 * So: one viewport-sized shot per call, the width set by the test's own
 * `test.use({ viewport })` rather than by resizing, and only on the handful of
 * screens worth a picture.
 */
import { Page, TestInfo } from '@playwright/test';

export const PHONE = { width: 390, height: 844 };

/**
 * Attaches one screenshot of the current page at its current viewport.
 *
 * `fullPage` is off by default because it forces a re-render of the whole
 * document; pass it only for a shot that has to show what is below the fold.
 */
export async function shoot(
  page: Page,
  testInfo: TestInfo,
  name: string,
  options: { fullPage?: boolean } = {}
) {
  const size = page.viewportSize();
  const label = size ? `${name} (${size.width}px)` : name;
  await testInfo.attach(label, {
    body: await page.screenshot({ fullPage: options.fullPage === true }),
    contentType: 'image/png',
  });
}
