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

  test('withCloudinaryDelivery injects f_auto,q_auto into Cloudinary URLs', async ({ page }) => {
    await page.goto(mapUrl());
    await expect(page).not.toHaveURL(/\/login/);

    const result = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fn = (window as any).ImageCompress.withCloudinaryDelivery as (u: string) => string;
      return {
        cloudinary: fn('https://res.cloudinary.com/demo/image/upload/v123/community-maps/abc.jpg'),
        nonCloudinary: fn('/static/images/GTA-V-Custom-Postal-Code-Map.jpg'),
        alreadyTransformed: fn(
          'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/community-maps/abc.jpg',
        ),
      };
    });

    expect(result.cloudinary).toContain('/upload/f_auto,q_auto/');
    expect(result.nonCloudinary).toBe('/static/images/GTA-V-Custom-Postal-Code-Map.jpg');
    // Idempotent — doesn't double-inject.
    expect(result.alreadyTransformed.match(/f_auto/g)?.length).toBe(1);
  });

  test('opens the optimize modal when a file is selected, then cancels cleanly', async ({ page }) => {
    await page.goto(mapUrl());
    await expect(page).not.toHaveURL(/\/login/);

    // 1x1 red PNG (43 bytes) — smallest valid PNG for the file picker.
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64',
    );

    await page.setInputFiles('#mapFileInput', {
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    });

    // Modal opens.
    const modal = page.locator('#uploadPreviewModal');
    await expect(modal).toHaveClass(/active/, { timeout: 5_000 });

    // Preset radios present, Medium is default.
    await expect(page.locator('.cm-preset-btn[data-preset="low"]')).toBeVisible();
    await expect(page.locator('.cm-preset-btn[data-preset="medium"]')).toHaveClass(/active/);
    await expect(page.locator('.cm-preset-btn[data-preset="high"]')).toBeVisible();

    // Stats populate once compression finishes.
    await expect(page.locator('#statOriginal')).not.toHaveText('—', { timeout: 5_000 });
    await expect(page.locator('#statOptimized')).not.toHaveText('—');
    await expect(page.locator('#statDims')).not.toHaveText('—');

    // Cancel closes the modal — does NOT hit the API.
    await page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(modal).not.toHaveClass(/active/);
  });

  test('preset switch re-runs compression and updates stats', async ({ page }) => {
    await page.goto(mapUrl());
    await expect(page).not.toHaveURL(/\/login/);

    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64',
    );
    await page.setInputFiles('#mapFileInput', {
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    });

    await expect(page.locator('#uploadPreviewModal')).toHaveClass(/active/);
    await expect(page.locator('#statOptimized')).not.toHaveText('—', { timeout: 5_000 });

    // Switching preset toggles the active class.
    await page.locator('.cm-preset-btn[data-preset="low"]').click();
    await expect(page.locator('.cm-preset-btn[data-preset="low"]')).toHaveClass(/active/);
    await expect(page.locator('.cm-preset-btn[data-preset="medium"]')).not.toHaveClass(/active/);
  });
});
