import { test, expect } from '@playwright/test';
import { TEST_COMMUNITY_ID } from '../../helpers/seed';

test.describe('Case Search (Courts dashboard)', { tag: '@auth' }, () => {
  test('toolbar button opens the modal with focused input', async ({ page }) => {
    await page.goto(`/court-cases?c=${TEST_COMMUNITY_ID.toHexString()}`);
    await expect(page).not.toHaveURL(/\/login/);

    const btn = page.locator('#ccCaseSearchBtn');
    await expect(btn).toBeVisible({ timeout: 15_000 });
    await btn.click();

    const modal = page.locator('#caseSearchModal');
    await expect(modal).toHaveClass(/open/, { timeout: 3_000 });

    const input = page.locator('#caseSearchInput');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
  });

  test('shows empty state for unmatched query, prompt when empty', async ({ page }) => {
    await page.goto(`/court-cases?c=${TEST_COMMUNITY_ID.toHexString()}`);
    await expect(page).not.toHaveURL(/\/login/);
    await page.locator('#ccCaseSearchBtn').click();

    const list = page.locator('#searchList');
    await expect(list.getByText(/Enter a case number/i)).toBeVisible({ timeout: 5_000 });

    await page.locator('#caseSearchInput').fill('CC-9999-999999');
    await expect(list.getByText(/No cases match\.|access to search/i)).toBeVisible({ timeout: 10_000 });
  });

  test('Escape closes the modal', async ({ page }) => {
    await page.goto(`/court-cases?c=${TEST_COMMUNITY_ID.toHexString()}`);
    await expect(page).not.toHaveURL(/\/login/);
    await page.locator('#ccCaseSearchBtn').click();
    await expect(page.locator('#caseSearchModal')).toHaveClass(/open/);

    await page.keyboard.press('Escape');
    await expect(page.locator('#caseSearchModal')).not.toHaveClass(/open/, { timeout: 3_000 });
  });
});

test.describe('Case Search (LEO sidebar)', { tag: '@auth' }, () => {
  test('Case Search nav item opens the modal', async ({ page }) => {
    await page.goto('/command-dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    const navItem = page.locator('#cd-nav-case-search');
    await expect(navItem).toBeVisible({ timeout: 15_000 });
    await navItem.click();

    const overlay = page.locator('#cd-case-search-overlay');
    await expect(overlay).toHaveClass(/visible/, { timeout: 3_000 });
    await expect(page.locator('#cd-case-search-input')).toBeVisible();
    await expect(page.locator('#cd-case-search-input')).toBeFocused();
  });
});
