/**
 * The console's first paint, before any JavaScript runs.
 *
 * This exists because of a specific failure: every console style lived in a
 * styled-jsx global block inside a client component, so none of it reached the
 * server HTML. The inline SVGs carry a viewBox and nothing else, which gives
 * them no intrinsic size, so until the JavaScript landed they stretched to the
 * width of their container — the "Back to LPC" arrow filled the screen on
 * every page load.
 *
 * JavaScript is disabled here on purpose. That is the state the browser is in
 * between receiving the HTML and running the bundle, and it is the only way to
 * assert on what that moment looks like. Two independent things have to hold
 * for it to be right, so both are checked: the stylesheet has to be in the
 * initial HTML, and the icons have to be sized even if it is not.
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const CONSOLE_PAGES = [
  '/developer',
  '/developer/usage',
  '/developer/keys',
  '/developer/keys/new',
  '/developer/settings',
];

// The console is signed-in only, so this reuses the shared auth state while
// running with scripting turned off.
test.use({
  javaScriptEnabled: false,
  storageState: path.join(__dirname, '../../.auth/user.json'),
});

test.describe('Developer console: first paint', { tag: '@auth' }, () => {
  for (const url of CONSOLE_PAGES) {
    test(`${url} ships its styles in the HTML and sizes its icons`, async ({ page }) => {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);

      const html = (await response?.text()) || '';

      // The rules must arrive with the document, not with the bundle.
      expect(html).toMatch(/<link[^>]+rel="stylesheet"/);

      // Every inline SVG carries real dimensions, so a slow or blocked
      // stylesheet cannot turn one into a full-width shape.
      const unsized = (html.match(/<svg(?![^>]*\bwidth=)[^>]*>/g) || []).filter(
        // The usage chart is deliberately fluid and is inside a card that only
        // renders once data has loaded, so it never appears at first paint.
        (tag) => !tag.includes('role="img"')
      );
      expect(unsized, `unsized inline SVGs in the first paint: ${unsized.join(' ')}`).toHaveLength(0);
    });
  }

  test('the back arrow is small before any script runs', async ({ page }) => {
    await page.goto('/developer', { waitUntil: 'domcontentloaded' });

    const icon = page.locator('.dc-back-icon').first();
    await expect(icon).toBeVisible();

    const box = await icon.boundingBox();
    expect(box).not.toBeNull();
    // It was filling the viewport. Anything in this range is an icon.
    expect(box!.width).toBeLessThan(24);
    expect(box!.height).toBeLessThan(24);
  });

  test('no console icon is wider than its own header', async ({ page }) => {
    await page.goto('/developer', { waitUntil: 'domcontentloaded' });

    const widest = await page.evaluate(() => {
      const svgs = Array.from(document.querySelectorAll('svg'));
      return svgs.reduce((max, el) => Math.max(max, el.getBoundingClientRect().width), 0);
    });
    expect(widest).toBeLessThan(200);
  });
});
