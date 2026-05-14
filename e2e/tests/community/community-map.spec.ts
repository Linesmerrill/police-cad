import { test, expect } from '@playwright/test';
import { communityDetailsUrl } from '../../helpers/test-urls';

const mapUrl = () => `${communityDetailsUrl()}/map`;

test.describe('Community Map — Optimize-on-Upload Modal', { tag: '@auth' }, () => {
  test('renders the page for the community owner', async ({ page }) => {
    const response = await page.goto(mapUrl());
    await expect(page).not.toHaveURL(/\/login/);
    expect(response?.status()).not.toBe(500);

    // Owner-only Upload Map button must be present.
    await expect(page.getByRole('button', { name: /upload map/i })).toBeVisible({ timeout: 8_000 });
  });

  test('exposes the ImageCompress helper on window', async ({ page }) => {
    await page.goto(mapUrl());
    await expect(page).not.toHaveURL(/\/login/);

    // The helper script must be loaded — it powers the upload preview.
    const hasHelper = await page.evaluate(() => {
      return Boolean(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).ImageCompress &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          typeof (window as any).ImageCompress.compressImage === 'function' &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          typeof (window as any).ImageCompress.withCloudinaryDelivery === 'function',
      );
    });
    expect(hasHelper).toBe(true);
  });

  test('withCloudinaryDelivery serves the URL unchanged (no double-compression)', async ({ page }) => {
    await page.goto(mapUrl());
    await expect(page).not.toHaveURL(/\/login/);

    // We deliberately do NOT inject f_auto/q_auto on delivery: Cloudinary's
    // q_auto re-encodes the already-client-compressed JPEG and visibly
    // degrades quality at high zoom on the community map page. The helper
    // is kept as an identity function so callers don't need to change.
    const result = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fn = (window as any).ImageCompress.withCloudinaryDelivery as (u: string) => string;
      return {
        cloudinary: fn('https://res.cloudinary.com/demo/image/upload/v123/community-maps/abc.jpg'),
        nonCloudinary: fn('/static/images/GTA-V-Custom-Postal-Code-Map.jpg'),
      };
    });

    expect(result.cloudinary).toBe(
      'https://res.cloudinary.com/demo/image/upload/v123/community-maps/abc.jpg',
    );
    expect(result.nonCloudinary).toBe('/static/images/GTA-V-Custom-Postal-Code-Map.jpg');
    // Critically: must NOT contain f_auto or q_auto transforms.
    expect(result.cloudinary).not.toContain('f_auto');
    expect(result.cloudinary).not.toContain('q_auto');
  });

  test('skips the modal entirely for sub-2MB sources (fast path)', async ({ page }) => {
    await page.goto(mapUrl());
    await expect(page).not.toHaveURL(/\/login/);

    // Block the Cloudinary signature call so the fast path can't actually
    // upload during the test — we only care that the modal stays closed.
    await page.route('**/api/v1/generate-signature', (route) => route.abort());

    // 1x1 red PNG (~43 bytes) — well under the 2MB fast-path threshold.
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64',
    );

    await page.setInputFiles('#mapFileInput', {
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    });

    // Give the fast path a moment to run (or fail at the signature call).
    await page.waitForTimeout(500);

    // The optimize modal must NOT appear for a sub-2MB source.
    await expect(page.locator('#uploadPreviewModal')).not.toHaveClass(/active/);
  });

  test('opens the optimize modal with High default for sources >=2MB', async ({ page }) => {
    await page.goto(mapUrl());
    await expect(page).not.toHaveURL(/\/login/);

    // 3MB zero-filled buffer — invalid pixels but the input layer only
    // checks file.size before deciding fast-path vs modal. Modal must
    // still open (compression failure surfaces inside, that's a separate
    // assertion).
    const bigBuffer = Buffer.alloc(3 * 1024 * 1024);

    await page.setInputFiles('#mapFileInput', {
      name: 'big.png',
      mimeType: 'image/png',
      buffer: bigBuffer,
    });

    const modal = page.locator('#uploadPreviewModal');
    await expect(modal).toHaveClass(/active/, { timeout: 5_000 });

    // Player-benefit copy is present.
    await expect(page.locator('#statLoad')).toBeVisible();
    await expect(page.getByText(/use less player data/i)).toBeVisible();

    // The disclosure is collapsed by default — Medium/Low aren't competing
    // for attention with the Save button.
    const altDisclosure = page.locator('#altDisclosure');
    await expect(altDisclosure).not.toHaveAttribute('open', '');

    // Cancel closes the modal — does NOT hit the API. Scoped to the optimize
    // modal because the page also renders #removeModal with its own Cancel.
    await modal.getByRole('button', { name: /^cancel$/i }).click();
    await expect(modal).not.toHaveClass(/active/);
  });
});
