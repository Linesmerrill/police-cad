import { test, expect } from '@playwright/test';

test.describe('BOLO Management', { tag: '@auth' }, () => {
  test('can create a new BOLO', async ({ page }) => {
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    // Look for the new BOLO button
    const newBoloBtn = page.locator('.cd-bolo-new-btn, [data-action="new-bolo"], button:has-text("BOLO")').first();
    await expect(newBoloBtn).toBeVisible({ timeout: 15_000 });
    await newBoloBtn.click();

    // Fill in BOLO form fields
    const titleInput = page.locator('input[name="title"], .cd-bolo-form input').first();
    await expect(titleInput).toBeVisible({ timeout: 5_000 });
    await titleInput.fill('E2E Test BOLO - Suspect Vehicle');

    const descInput = page.locator('textarea[name="description"], .cd-bolo-form textarea').first();
    if (await descInput.isVisible()) {
      await descInput.fill('Blue Honda Civic, plate TST1234. Last seen heading northbound.');
    }

    // Submit the BOLO
    const submitBtn = page.locator('#cd-bolo-submit, .cd-bolo-form button[type="submit"]').first();
    await submitBtn.click();

    // Verify the BOLO appears in the list or a success notification shows
    await expect(
      page.getByText(/E2E Test BOLO|BOLO.*created|success/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
