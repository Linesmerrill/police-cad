import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class ResetPasswordPage extends BasePage {
  readonly passwordInput: Locator;
  readonly confirmInput: Locator;
  readonly submitButton: Locator;
  readonly invalidTokenHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.passwordInput = page.locator('#password');
    this.confirmInput = page.locator('#confirmPassword');
    this.submitButton = page.getByRole('button', { name: /update password/i });
    this.invalidTokenHeading = page.getByRole('heading', { name: /invalid token/i });
  }

  async goto(token: string) {
    await this.page.goto(`/reset/${token}`);
  }

  async submitNewPassword(password: string) {
    await this.passwordInput.waitFor({ state: 'visible', timeout: 15_000 });
    await this.passwordInput.fill(password);
    await this.confirmInput.fill(password);
    await this.submitButton.click();
  }

  async expectInvalidToken() {
    await expect(this.invalidTokenHeading).toBeVisible({ timeout: 15_000 });
  }
}
