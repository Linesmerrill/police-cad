import { Page, Locator, expect } from '@playwright/test';

export class DispatchDashboardPage {
  readonly page: Page;
  readonly callTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.callTable = page.locator('#callTable');
  }

  async goto() {
    await this.page.goto('/dispatch-dashboard');
    await expect(this.callTable).toBeVisible({ timeout: 20_000 });
  }

  async waitForCallsLoaded() {
    await this.page.waitForTimeout(2000);
  }

  // ── Create call ──────────────────────────────────────────────────
  async openCreateCallModal() {
    await this.page.locator('button:has-text("Create Call")').first().click();
    await expect(this.page.locator('#callModal')).toBeVisible({ timeout: 5_000 });
  }

  async fillCallForm(opts: { title: string; details?: string }) {
    await this.page.locator('#callTitle').fill(opts.title);
    if (opts.details) {
      await this.page.locator('#callDetails').fill(opts.details);
    }
  }

  async submitCall() {
    await this.page.locator('#callModal button:has-text("Create")').click();
  }

  async expectToast(text: string | RegExp) {
    await expect(
      this.page.locator('.toast, .toast-message, [class*="toast"]').filter({ hasText: text }).first()
    ).toBeVisible({ timeout: 10_000 });
  }

  // ── Call row interaction ─────────────────────────────────────────
  callRow(titleSubstring: string) {
    return this.page
      .locator('#callTable tbody tr')
      .filter({ hasText: new RegExp(titleSubstring, 'i') })
      .first();
  }

  async openCallDetails(titleSubstring: string) {
    await this.callRow(titleSubstring).click();
    await expect(this.page.locator('#callDetailModal')).toBeVisible({ timeout: 5_000 });
  }

  // ── Call detail actions ──────────────────────────────────────────
  async addNote(text: string) {
    await this.page.locator('#addNoteBtn').click();
    await expect(this.page.locator('#addNoteSection')).toBeVisible({ timeout: 3_000 });
    await this.page.locator('#newNoteInput').fill(text);
    this.page.once('dialog', (d) => d.accept());
    await this.page.locator('#addNoteSection button:has-text("Add Note")').click();
  }

  async markCompleted() {
    await this.page.locator('#closeCallBtn').click();
    await expect(this.page.locator('#markCompletedModal')).toBeVisible({ timeout: 3_000 });
    await this.page.locator('#markCompletedModal button:has-text("Mark as Completed")').click();
  }

  async deleteCall() {
    await this.page.locator('#deleteCallBtnOpen').click();
    await expect(this.page.locator('#deleteCallModal')).toBeVisible({ timeout: 3_000 });
    await this.page.locator('#deleteCallModal button:has-text("Delete")').click();
  }
}
